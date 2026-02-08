/**
 * WalletConnectButton - Component for connecting to Sui wallet
 */
import React from 'react';
import {
    ConnectButton,
    useCurrentAccount,
    useDisconnectWallet,
} from '@mysten/dapp-kit';
import { Wallet, SignOut } from '@phosphor-icons/react';
import './WalletConnectButton.css';

interface WalletConnectButtonProps {
    variant?: 'compact' | 'full';
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({ variant = 'full' }) => {
    const account = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    // Format address to show first and last 4 characters
    const formatAddress = (address: string): string => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (!account) {
        return (
            <div className={`wallet-connect-wrapper ${variant}`}>
                <ConnectButton
                    connectText={
                        <span className="connect-btn-content">
                            <Wallet size={18} weight="bold" />
                            {variant === 'full' && 'Kết nối Wallet'}
                        </span>
                    }
                />
            </div>
        );
    }

    return (
        <div className={`wallet-connected ${variant}`}>
            <div className="wallet-info">
                <Wallet size={18} weight="fill" className="wallet-icon" />
                <span className="wallet-address">{formatAddress(account.address)}</span>
            </div>
            {variant === 'full' && (
                <button
                    className="disconnect-btn"
                    onClick={() => disconnect()}
                    title="Ngắt kết nối"
                >
                    <SignOut size={16} />
                </button>
            )}
        </div>
    );
};

export default WalletConnectButton;
