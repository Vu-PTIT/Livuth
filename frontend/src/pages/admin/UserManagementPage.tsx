import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '../../api/endpoints';
import type { User } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { ArrowLeft, Trash, MagnifyingGlass } from '@phosphor-icons/react';
import './AdminPages.css';

const UserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        filterUsers();
    }, [searchQuery, users]);

    const fetchUsers = async () => {
        try {
            const response = await userApi.getAll();
            setUsers(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filterUsers = () => {
        if (!searchQuery) {
            setFilteredUsers(users);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredUsers(
                users.filter(
                    (user) =>
                        user.username?.toLowerCase().includes(query) ||
                        user.email?.toLowerCase().includes(query) ||
                        user.full_name?.toLowerCase().includes(query)
                )
            );
        }
    };

    const handleDelete = async () => {
        if (!deleteUserId) return;

        setIsDeleting(true);
        try {
            await userApi.delete(deleteUserId);
            setUsers((prev) => prev.filter((u) => u.id !== deleteUserId));
            setDeleteUserId(null);
        } catch (error) {
            console.error('Failed to delete user:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <LoadingSpinner text="Đang tải..." />
            </div>
        );
    }

    return (
        <div className="admin-page container">
            <Link to="/admin" className="back-link">
                <ArrowLeft size={18} />
                Dashboard
            </Link>

            <div className="page-header">
                <div>
                    <h1 className="page-title">Quản lý người dùng</h1>
                    <p className="page-subtitle">{users.length} người dùng</p>
                </div>
            </div>

            {/* Search */}
            <div className="search-bar-admin">
                <MagnifyingGlass size={20} />
                <input
                    type="text"
                    placeholder="Tìm kiếm theo tên, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Users Table */}
            <div className="table-container card">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Người dùng</th>
                            <th>Email</th>
                            <th>Vai trò</th>
                            <th>Trạng thái</th>
                            <th>Ngày tạo</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id}>
                                <td>
                                    <div className="user-cell">
                                        <div className="user-avatar-small">
                                            {user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <span className="user-name">{user.full_name || user.username}</span>
                                            <span className="user-username">@{user.username}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>{user.email}</td>
                                <td>
                                    <div className="roles-list">
                                        {user.roles.slice(0, 2).map((role, idx) => (
                                            <span key={idx} className="role-tag">{role}</span>
                                        ))}
                                        {user.roles.length > 2 && (
                                            <span className="role-tag more">+{user.roles.length - 2}</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span className={`status-dot ${user.is_active ? 'active' : 'inactive'}`}>
                                        {user.is_active ? 'Hoạt động' : 'Vô hiệu'}
                                    </span>
                                </td>
                                <td>{new Date(user.created_at * 1000).toLocaleDateString('vi-VN')}</td>
                                <td>
                                    <div className="table-actions">
                                        <button
                                            className="action-btn delete"
                                            title="Xóa"
                                            onClick={() => setDeleteUserId(user.id)}
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Delete Modal */}
            <Modal
                isOpen={!!deleteUserId}
                onClose={() => setDeleteUserId(null)}
                title="Xác nhận xóa"
                size="small"
            >
                <p>Bạn có chắc chắn muốn xóa người dùng này?</p>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => setDeleteUserId(null)}>
                        Hủy
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Đang xóa...' : 'Xóa'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default UserManagementPage;
