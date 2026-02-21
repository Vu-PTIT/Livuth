import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CalendarBlank, MapTrifold } from '@phosphor-icons/react';
import { useAuth } from '../hooks/useAuth';
import './MobileCreateFAB.css';

const MobileCreateFAB: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { isEventProvider, isTourProvider } = useAuth();
    const navigate = useNavigate();

    const toggleOpen = () => setIsOpen(!isOpen);

    const handleAction = (type: 'event' | 'tour') => {
        setIsOpen(false);
        if (type === 'event') {
            if (isEventProvider) {
                navigate('/my-events');
            } else {
                // Navigate to upgrade page if not a provider
                navigate('/profile/upgrade');
            }
        } else if (type === 'tour') {
            if (isTourProvider) {
                navigate('/my-listings');
            } else {
                // Navigate to upgrade page if not a provider
                navigate('/profile/upgrade');
            }
        }
    };

    return (
        <div className="mobile-create-fab-container">
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            className="fab-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Menu Items */}
                        <div className="fab-menu">
                            <motion.button
                                className="fab-item"
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                transition={{ delay: 0.1 }}
                                onClick={() => handleAction('tour')}
                            >
                                <span className="fab-label">Quản lý Tour</span>
                                <div className="fab-icon-wrapper tour">
                                    <MapTrifold size={24} weight="fill" />
                                </div>
                            </motion.button>

                            <motion.button
                                className="fab-item"
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                transition={{ delay: 0.05 }}
                                onClick={() => handleAction('event')}
                            >
                                <span className="fab-label">Quản lý Sự kiện</span>
                                <div className="fab-icon-wrapper event">
                                    <CalendarBlank size={24} weight="fill" />
                                </div>
                            </motion.button>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* Main FAB Trigger */}
            <motion.button
                className={`fab-trigger ${isOpen ? 'open' : ''}`}
                onClick={toggleOpen}
                whileTap={{ scale: 0.95 }}
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2 }}
            >
                <Plus size={32} weight="bold" />
            </motion.button>
        </div>
    );
};

export default MobileCreateFAB;
