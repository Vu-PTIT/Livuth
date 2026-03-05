// Unified category definitions used across the application
// This includes categories for events, hobbies, map filters, etc.

export interface Category {
    id: string;
    name: string;
    icon: string;
}

// Main categories - used for events, hobbies, and filters
export const CATEGORIES: Category[] = [
    { id: 'van-hoa', name: 'Văn hóa', icon: '🎭' },
    { id: 'tam-linh', name: 'Tâm linh', icon: '🙏' },
    { id: 'am-thuc', name: 'Ẩm thực', icon: '🍜' },
    { id: 'am-nhac', name: 'Âm nhạc', icon: '🎵' },
    { id: 'the-thao', name: 'Thể thao', icon: '⚽' },
    { id: 'nghe-thuat', name: 'Nghệ thuật', icon: '🎨' },
    { id: 'du-lich', name: 'Du lịch', icon: '✈️' },
    { id: 'le-hoi', name: 'Lễ hội', icon: '🎉' },
    { id: 'gia-dinh', name: 'Gia đình', icon: '👨‍👩‍👧‍👦' },
    { id: 'thien-nhien', name: 'Thiên nhiên', icon: '🌿' },
    { id: 'giai-tri', name: 'Giải trí', icon: '🎮' },
    { id: 'di-san', name: 'Di sản', icon: '🏛️' },
];

// Get just the category names as a string array
export const CATEGORY_NAMES = CATEGORIES.map(c => c.name);

// Get icon by category name
export const getCategoryIcon = (name: string): string => {
    return CATEGORIES.find(c => c.name.toLowerCase() === name.toLowerCase())?.icon || '🏷️';
};

// Get category by id
export const getCategoryById = (id: string): Category | undefined => {
    return CATEGORIES.find(c => c.id === id);
};

// Get category by name
export const getCategoryByName = (name: string): Category | undefined => {
    return CATEGORIES.find(c => c.name === name);
};
