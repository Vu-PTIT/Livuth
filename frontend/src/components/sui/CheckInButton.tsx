/**
 * CheckInButton - Component for checking in to an event with NFT minting
 */
import React, { useState, useEffect } from 'react';
import {
    useCurrentAccount,
    useSignAndExecuteTransaction,
    useSuiClient,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { MapPinLine, CheckCircle, CircleNotch, Warning } from '@phosphor-icons/react';
import { PACKAGE_ID, CLOCK_OBJECT_ID, MODULE_NAME, MINT_FUNCTION } from '../../constants/sui';
import { checkinApi } from '../../api/checkinApi';
import WalletConnectButton from './WalletConnectButton';
import './CheckInButton.css';

interface CheckInButtonProps {
    eventId: string;
    eventName: string;
    eventLocation: string;
    eventImageUrl?: string;
    onCheckInSuccess?: () => void;
}

type CheckInState = 'idle' | 'loading' | 'minting' | 'recording' | 'success' | 'error';

export const CheckInButton: React.FC<CheckInButtonProps> = ({
    eventId,
    eventName,
    eventLocation,
    eventImageUrl = '',
    onCheckInSuccess,
}) => {
    const account = useCurrentAccount();
    const client = useSuiClient();
    const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

    const [state, setState] = useState<CheckInState>('idle');
    const [hasCheckedIn, setHasCheckedIn] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txDigest, setTxDigest] = useState<string | null>(null);

    // Check if user has already checked in
    useEffect(() => {
        const checkStatus = async () => {
            if (!eventId) return;

            try {
                setState('loading');
                const response = await checkinApi.verify(eventId);
                if (response.data.data?.has_checked_in) {
                    setHasCheckedIn(true);
                    setTxDigest(response.data.data.checkin?.tx_digest || null);
                }
            } catch (err) {
                console.error('Failed to check status:', err);
            } finally {
                setState('idle');
            }
        };

        checkStatus();
    }, [eventId]);

    const handleCheckIn = async () => {
        if (!account) return;

        setError(null);
        setState('minting');

        try {
            // Build the transaction
            const tx = new Transaction();

            // Call the mint_checkin function
            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::${MINT_FUNCTION}`,
                arguments: [
                    tx.pure.vector('u8', new TextEncoder().encode(eventId)),
                    tx.pure.vector('u8', new TextEncoder().encode(eventName)),
                    tx.pure.vector('u8', new TextEncoder().encode(eventLocation)),
                    tx.pure.vector('u8', new TextEncoder().encode(eventImageUrl)),
                    tx.object(CLOCK_OBJECT_ID),
                ],
            });

            // Sign and execute transaction
            const result = await signAndExecute({
                transaction: tx,
            });

            // Wait for transaction to be confirmed
            await client.waitForTransaction({ digest: result.digest });

            // Get the created NFT object ID from transaction effects
            const txDetails = await client.getTransactionBlock({
                digest: result.digest,
                options: { showObjectChanges: true },
            });

            const createdObjects = txDetails.objectChanges?.filter(
                (change: { type: string; objectId?: string }) => change.type === 'created'
            );
            const nftObjectId = createdObjects?.[0]?.type === 'created'
                ? createdObjects[0].objectId
                : '';

            // Record check-in in backend
            setState('recording');
            await checkinApi.create(eventId, {
                wallet_address: account.address,
                nft_object_id: nftObjectId,
                tx_digest: result.digest,
            });

            setHasCheckedIn(true);
            setTxDigest(result.digest);
            setState('success');
            onCheckInSuccess?.();
        } catch (err: any) {
            console.error('Check-in failed:', err);
            setError(err.message || 'Check-in thất bại. Vui lòng thử lại.');
            setState('error');
        }
    };

    // If already checked in, show success state
    if (hasCheckedIn) {
        return (
            <div className="checkin-wrapper">
                <div className="checkin-success">
                    <CheckCircle size={24} weight="fill" />
                    <div className="success-content">
                        <span className="success-text">Đã check-in</span>
                        {txDigest && (
                            <a
                                href={`https://suiscan.xyz/testnet/tx/${txDigest}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tx-link"
                            >
                                Xem NFT →
                            </a>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Require wallet connection
    if (!account) {
        return (
            <div className="checkin-wrapper">
                <div className="checkin-connect-prompt">
                    <MapPinLine size={20} weight="bold" />
                    <span>Check-in với NFT</span>
                </div>
                <WalletConnectButton variant="compact" />
            </div>
        );
    }

    return (
        <div className="checkin-wrapper">
            <button
                className={`checkin-btn ${state}`}
                onClick={handleCheckIn}
                disabled={state === 'minting' || state === 'recording' || state === 'loading'}
            >
                {state === 'loading' && (
                    <>
                        <CircleNotch size={20} className="spin" />
                        <span>Đang kiểm tra...</span>
                    </>
                )}
                {state === 'minting' && (
                    <>
                        <CircleNotch size={20} className="spin" />
                        <span>Đang tạo NFT...</span>
                    </>
                )}
                {state === 'recording' && (
                    <>
                        <CircleNotch size={20} className="spin" />
                        <span>Lưu check-in...</span>
                    </>
                )}
                {(state === 'idle' || state === 'error') && (
                    <>
                        <MapPinLine size={20} weight="bold" />
                        <span>Check-in với NFT</span>
                    </>
                )}
            </button>

            {state === 'error' && error && (
                <div className="checkin-error">
                    <Warning size={16} />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

export default CheckInButton;
