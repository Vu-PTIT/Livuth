/**
 * SuiWalletProvider - Wrapper component for Sui wallet integration
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider, createNetworkConfig } from '@mysten/dapp-kit';
import '@mysten/dapp-kit/dist/index.css';

// Create a client outside of the component to prevent recreating on every render
const queryClient = new QueryClient();

// Network configuration using createNetworkConfig for @mysten/dapp-kit v1.x
const { networkConfig } = createNetworkConfig({
    testnet: {
        url: 'https://fullnode.testnet.sui.io:443',
        network: 'testnet' as const,
    },
    mainnet: {
        url: 'https://fullnode.mainnet.sui.io:443',
        network: 'mainnet' as const,
    },
    devnet: {
        url: 'https://fullnode.devnet.sui.io:443',
        network: 'devnet' as const,
    },
});

interface SuiWalletProviderProps {
    children: React.ReactNode;
}

export const SuiWalletProvider: React.FC<SuiWalletProviderProps> = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
                <WalletProvider autoConnect>
                    {children}
                </WalletProvider>
            </SuiClientProvider>
        </QueryClientProvider>
    );
};

export default SuiWalletProvider;
