"""
Chat API Routes
"""
from typing import Any, List
from fastapi import APIRouter, status, Depends
from backend.utils.exception_handler import CustomException
from backend.schemas.sche_response import DataResponse
from backend.schemas.sche_chat import (
    ChatMessageRequest,
    ChatConversationCreateRequest,
    ChatConversationResponse,
    ChatMessageResponse,
    ChatHistoryResponse
)
from backend.services.srv_chat_mongo import ChatService
from backend.core.security import JWTBearer, decode_jwt

router = APIRouter(prefix="/chat")

chat_service = ChatService()


def get_user_id_from_token(token: str) -> str:
    """Extract user ID from JWT token"""
    payload = decode_jwt(token)
    if not payload:
        raise CustomException(exception=CustomException(http_code=401, message="Invalid token"))
    return payload.get("sub")


@router.post(
    "/conversations",
    response_model=DataResponse[ChatConversationResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    data: ChatConversationCreateRequest,
    token: str = Depends(JWTBearer())
) -> Any:
    """Create new chat conversation"""
    try:
        user_id = get_user_id_from_token(token)
        conversation = await chat_service.create_conversation(user_id, data)
        return DataResponse(http_code=status.HTTP_201_CREATED, data=conversation)
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/conversations",
    response_model=DataResponse[List[ChatConversationResponse]],
    status_code=status.HTTP_200_OK,
)
async def get_my_conversations(token: str = Depends(JWTBearer())) -> Any:
    """Get all conversations for current user"""
    try:
        user_id = get_user_id_from_token(token)
        data, metadata = await chat_service.get_user_conversations(user_id)
        return DataResponse(http_code=status.HTTP_200_OK, data=data, metadata=metadata)
    except Exception as e:
        raise CustomException(exception=e)


@router.get(
    "/conversations/{conversation_id}",
    response_model=DataResponse[ChatHistoryResponse],
    status_code=status.HTTP_200_OK,
)
async def get_conversation_history(
    conversation_id: str,
    token: str = Depends(JWTBearer())
) -> Any:
    """Get conversation with full message history"""
    try:
        user_id = get_user_id_from_token(token)
        conversation = await chat_service.get_conversation_with_history(conversation_id, user_id)
        return DataResponse(http_code=status.HTTP_200_OK, data=conversation)
    except Exception as e:
        raise CustomException(exception=e)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=DataResponse[ChatMessageResponse],
    status_code=status.HTTP_200_OK,
)
async def send_message(
    conversation_id: str,
    message_data: ChatMessageRequest,
    token: str = Depends(JWTBearer())
) -> Any:
    """Send message to chatbot and get AI response"""
    try:
        user_id = get_user_id_from_token(token)
        ai_response = await chat_service.send_message(conversation_id, user_id, message_data)
        return DataResponse(http_code=status.HTTP_200_OK, data=ai_response)
    except Exception as e:
        raise CustomException(exception=e)


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_conversation(
    conversation_id: str,
    token: str = Depends(JWTBearer())
) -> None:
    """Delete conversation and all its messages"""
    try:
        user_id = get_user_id_from_token(token)
        await chat_service.delete_conversation(conversation_id, user_id)
    except Exception as e:
        raise CustomException(exception=e)
