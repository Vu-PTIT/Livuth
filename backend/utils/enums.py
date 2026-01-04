import enum


class UserRole(enum.Enum):
    ADMIN = "Administrator"
    USER = "Normal user"
    SPECIALIST = "Specialist"
    TOUR_PROVIDER = "Tour Provider"
    EVENT_PROVIDER = "Event Provider"
    GUEST = "Guest"


class UserGender(enum.Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"
