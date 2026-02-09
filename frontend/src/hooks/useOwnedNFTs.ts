/**
 * Hook to fetch NFTs owned by the connected wallet
 */
import { useSuiClientQuery } from '@mysten/dapp-kit';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { PACKAGE_ID, MODULE_NAME } from '../constants/sui';

// NFT type from the deployed contract
const CHECKIN_NFT_TYPE = `${PACKAGE_ID}::${MODULE_NAME}::CheckInNFT`;

export interface CheckInNFT {
    id: string;
    objectId: string;
    eventId: string;
    eventName: string;
    eventLocation: string;
    eventImageUrl: string;
    ownerAddress: string;
    checkedInAt: number;
}

export function useOwnedNFTs() {
    const currentAccount = useCurrentAccount();
    const walletAddress = currentAccount?.address;

    const {
        data,
        isLoading,
        error,
        refetch
    } = useSuiClientQuery(
        'getOwnedObjects',
        {
            owner: walletAddress || '',
            filter: {
                StructType: CHECKIN_NFT_TYPE,
            },
            options: {
                showContent: true,
                showDisplay: true,
            },
        },
        {
            enabled: !!walletAddress,
        }
    );

    // Parse NFT data from response
    const nfts: CheckInNFT[] = (data?.data || []).map((item: any) => {
        const content = item.data?.content;
        const fields = content?.fields || {};

        return {
            id: item.data?.objectId || '',
            objectId: item.data?.objectId || '',
            eventId: fields.event_id || '',
            eventName: fields.event_name || '',
            eventLocation: fields.event_location || '',
            eventImageUrl: fields.event_image_url || '',
            ownerAddress: fields.owner_address || '',
            checkedInAt: parseInt(fields.checked_in_at || '0', 10),
        };
    }).filter((nft: CheckInNFT) => nft.id); // Filter out invalid entries

    return {
        nfts,
        isLoading,
        error,
        refetch,
        isConnected: !!walletAddress,
        walletAddress,
    };
}

export default useOwnedNFTs;
