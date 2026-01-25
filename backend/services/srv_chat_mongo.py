"""
Chat Service for MongoDB with Google Gemini Integration
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from backend.core.database import db
from backend.core.config import settings
from backend.models.mongo_chat import ChatConversation, ChatMessage
from backend.schemas.sche_chat import (
    ChatConversationCreateRequest,
    ChatConversationResponse,
    ChatMessageResponse,
    ChatHistoryResponse,
    ChatMessageRequest
)
from backend.utils.exception_handler import CustomException, ExceptionType
from backend.services.ai_agent import AIAgent


class ChatService:
    """Chat Service for MongoDB operations with AI Agent integration"""
    
    def __init__(self):
        self.conversation_collection = "chat_conversations"
        self.message_collection = "chat_messages"
        self.ai_agent = AIAgent()
    
    def get_conversation_collection(self):
        """Get conversations collection"""
        return db.get_collection(self.conversation_collection)
    
    def get_message_collection(self):
        """Get messages collection"""
        return db.get_collection(self.message_collection)
    
    async def create_conversation(
        self, 
        user_id: str, 
        data: ChatConversationCreateRequest
    ) -> ChatConversationResponse:
        """Create new conversation"""
        collection = self.get_conversation_collection()
        
        if not ObjectId.is_valid(user_id):
            raise CustomException(exception=ExceptionType.BAD_REQUEST)
        
        # Prepare conversation document
        conversation_dict = {
            "user_id": ObjectId(user_id),
            "title": data.title or "New Conversation",
            "created_at": datetime.now().timestamp(),
            "updated_at": datetime.now().timestamp()
        }
        
        # Insert conversation
        result = await collection.insert_one(conversation_dict)
        
        # Get created conversation
        created_conversation = await collection.find_one({"_id": result.inserted_id})
        created_conversation["id"] = str(created_conversation["_id"])
        created_conversation["user_id"] = str(created_conversation["user_id"])
        
        return ChatConversationResponse(**created_conversation)
    
    async def get_user_conversations(self, user_id: str) -> tuple[List[ChatConversationResponse], Dict[str, Any]]:
        """Get all conversations for a user"""
        collection = self.get_conversation_collection()
        
        if not ObjectId.is_valid(user_id):
            raise CustomException(exception=ExceptionType.BAD_REQUEST)
        
        cursor = collection.find({"user_id": ObjectId(user_id)}).sort("updated_at", -1)
        conversations = await cursor.to_list(length=None)
        
        # Convert to response format
        conversation_responses = []
        for conv in conversations:
            conv["id"] = str(conv["_id"])
            conv["user_id"] = str(conv["user_id"])
            conversation_responses.append(ChatConversationResponse(**conv))
        
        metadata = {
            "total": len(conversations),
            "page": 1,
            "page_size": len(conversations),
            "user_id": user_id
        }
        
        return conversation_responses, metadata
    
    async def get_conversation_with_history(self, conversation_id: str, user_id: str) -> ChatHistoryResponse:
        """Get conversation with full message history"""
        conv_collection = self.get_conversation_collection()
        msg_collection = self.get_message_collection()
        
        if not ObjectId.is_valid(conversation_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        # Get conversation
        conversation = await conv_collection.find_one({
            "_id": ObjectId(conversation_id),
            "user_id": ObjectId(user_id)
        })
        
        if not conversation:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        # Get messages
        cursor = msg_collection.find({"conversation_id": ObjectId(conversation_id)}).sort("created_at", 1)
        messages = await cursor.to_list(length=None)
        
        # Convert to response format
        message_responses = []
        for msg in messages:
            msg["id"] = str(msg["_id"])
            msg["conversation_id"] = str(msg["conversation_id"])
            message_responses.append(ChatMessageResponse(**msg))
        
        conversation["id"] = str(conversation["_id"])
        conversation["user_id"] = str(conversation["user_id"])
        conversation["messages"] = message_responses
        
        return ChatHistoryResponse(**conversation)
    
    async def send_message(
        self, 
        conversation_id: str, 
        user_id: str, 
        message_data: ChatMessageRequest
    ) -> ChatMessageResponse:
        """Send user message and get AI response from Gemini via AIAgent"""
        conv_collection = self.get_conversation_collection()
        msg_collection = self.get_message_collection()
        
        try:
            if not ObjectId.is_valid(conversation_id):
                raise CustomException(exception=ExceptionType.NOT_FOUND)
            
            # Verify conversation belongs to user
            conversation = await conv_collection.find_one({
                "_id": ObjectId(conversation_id),
                "user_id": ObjectId(user_id)
            })
            
            if not conversation:
                raise CustomException(exception=ExceptionType.NOT_FOUND)
            
            # Store user message
            now = datetime.now().timestamp()
            user_message_dict = {
                "conversation_id": ObjectId(conversation_id),
                "role": "user",
                "content": message_data.content,
                "created_at": now,
                "updated_at": now
            }
            await msg_collection.insert_one(user_message_dict)
            
            # Get conversation history for context
            cursor = msg_collection.find({"conversation_id": ObjectId(conversation_id)}).sort("created_at", 1)
            history = await cursor.to_list(length=None)
            
            # Build chat history for Gemini
            chat_history = []
            for msg in history[:-1]:  # Exclude the just-added user message
                if msg["role"] == "user":
                    chat_history.append({
                        "role": "user",
                        "parts": [msg["content"]]
                    })
                elif msg["role"] == "assistant":
                    chat_history.append({
                        "role": "model",
                        "parts": [msg["content"]]
                    })
            
            # Get AI response using AIAgent
            ai_content = self.ai_agent.get_response(message_data.content, chat_history)
            
            # Store AI response
            now = datetime.now().timestamp()
            ai_message_dict = {
                "conversation_id": ObjectId(conversation_id),
                "role": "assistant",
                "content": ai_content,
                "created_at": now,
                "updated_at": now
            }
            result = await msg_collection.insert_one(ai_message_dict)
            
            # Update conversation timestamp
            await conv_collection.update_one(
                {"_id": ObjectId(conversation_id)},
                {"$set": {"updated_at": datetime.now().timestamp()}}
            )
            
            # Return AI message
            ai_message = await msg_collection.find_one({"_id": result.inserted_id})
            ai_message["id"] = str(ai_message["_id"])
            ai_message["conversation_id"] = str(ai_message["conversation_id"])
            
            return ChatMessageResponse(**ai_message)
            
        except CustomException:
            raise  # Re-raise CustomExceptions (NOT_FOUND, etc.)
        except Exception as e:
            import traceback
            print(f"Chat Service Error: {str(e)}")
            print(traceback.format_exc())
            
            # Create fallback response even if other errors occur
            try:
                now = datetime.now().timestamp()
                fallback_message = {
                    "conversation_id": ObjectId(conversation_id),
                    "role": "assistant", 
                    "content": "Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.",
                    "created_at": now,
                    "updated_at": now
                }
                result = await msg_collection.insert_one(fallback_message)
                fallback_message["id"] = str(result.inserted_id)
                fallback_message["conversation_id"] = str(fallback_message["conversation_id"])
                return ChatMessageResponse(**fallback_message)
            except:
                raise CustomException(http_code=500, message="Chat service error")
    
    async def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """Delete conversation and all its messages"""
        conv_collection = self.get_conversation_collection()
        msg_collection = self.get_message_collection()
        
        if not ObjectId.is_valid(conversation_id):
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        # Verify ownership
        conversation = await conv_collection.find_one({
            "_id": ObjectId(conversation_id),
            "user_id": ObjectId(user_id)
        })
        
        if not conversation:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        # Delete all messages
        await msg_collection.delete_many({"conversation_id": ObjectId(conversation_id)})
        
        # Delete conversation
        result = await conv_collection.delete_one({"_id": ObjectId(conversation_id)})
        
        if result.deleted_count == 0:
            raise CustomException(exception=ExceptionType.NOT_FOUND)
        
        return True
    
    async def ensure_active_conversation(self, user_id: str) -> ChatConversationResponse:
        """
        Ensure user has at least one conversation.
        If no conversations exist, create a new one.
        Called on login - keeps old chat history, just ensures there's an active conversation.
        """
        conv_collection = self.get_conversation_collection()
        
        if not ObjectId.is_valid(user_id):
            raise CustomException(exception=ExceptionType.BAD_REQUEST)
        
        # Check if user has any conversations
        existing = await conv_collection.find_one(
            {"user_id": ObjectId(user_id)},
            sort=[("updated_at", -1)]  # Get most recent
        )
        
        if existing:
            # User already has conversations, return the most recent one
            existing["id"] = str(existing["_id"])
            existing["user_id"] = str(existing["user_id"])
            return ChatConversationResponse(**existing)
        
        # No conversations exist, create a new one
        conversation_dict = {
            "user_id": ObjectId(user_id),
            "title": "New Conversation",
            "created_at": datetime.now().timestamp(),
            "updated_at": datetime.now().timestamp()
        }
        
        result = await conv_collection.insert_one(conversation_dict)
        
        created = await conv_collection.find_one({"_id": result.inserted_id})
        created["id"] = str(created["_id"])
        created["user_id"] = str(created["user_id"])
        
        return ChatConversationResponse(**created)
