from typing import Optional, TypeVar, Generic
from fastapi import status
from pydantic import BaseModel

T = TypeVar("T")



class MetadataResponse(BaseModel):
    page: int
    page_size: int
    total: int

    model_config = {
        "extra": "allow"
    }



class BaseResponse(BaseModel):
    __abstract__ = True

    http_code: Optional[int] = status.HTTP_200_OK
    success: Optional[bool] = True
    message: Optional[str] = None
    metadata: Optional[MetadataResponse] = None

    def __init__(
        self,
        http_code: Optional[int] = status.HTTP_200_OK,
        message: Optional[str] = None,
        metadata: Optional[MetadataResponse] = None,
        **kwargs,
    ):
        #print(f"========== BaseResponse ==========", flush=True)
        success = True if http_code < status.HTTP_400_BAD_REQUEST else False
        # Remove success from kwargs if present to avoid multiple values error
        if "success" in kwargs:
            kwargs.pop("success")
            
        super().__init__(
            http_code=http_code, 
            message=message, 
            metadata=metadata, 
            success=success, 
            **kwargs
        )


class DataResponse(BaseResponse, BaseModel, Generic[T]):
    data: Optional[T] = None

    class Config:
        arbitrary_types_allowed = True

    def __init__(
        self,
        http_code: Optional[int] = status.HTTP_200_OK,
        message: Optional[str] = None,
        data: Optional[T] = None,
        **kwargs,
    ):
        #print(f"========== DataResponse ==========", flush=True)
        super().__init__(
            http_code=http_code, 
            message=message, 
            data=data, 
            **kwargs
        )
