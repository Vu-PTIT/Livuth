/**
 * SuiWalletProvider - Wrapper component for Sui wallet integration
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import '@mysten/dapp-kit/dist/index.css';
import { SUI_NETWORK } from '../constants/sui';

// Create a client outside of the component to prevent recreating on every render
const queryClient = new QueryClient();

// Network configuration
const networks = {
    testnet: { url: getFullnodeUrl('testnet') },
    mainnet: { url: getFullnodeUrl('mainnet') },
    devnet: { url: getFullnodeUrl('devnet') },
};

interface SuiWalletProviderProps {
    children: React.ReactNode;
}

export const SuiWalletProvider: React.FC<SuiWalletProviderProps> = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            <SuiClientProvider networks={networks} defaultNetwork={SUI_NETWORK}>
                <WalletProvider autoConnect>
                    {children}
                </WalletProvider>
            </SuiClientProvider>
        </QueryClientProvider>
    );
};

export default SuiWalletProvider;
