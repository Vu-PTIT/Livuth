/**
 * NFT Card Component - Displays a single Check-in NFT
 */
import React from 'react';
import { MapPin, Calendar, ArrowSquareOut } from '@phosphor-icons/react';
import type { CheckInNFT } from '../hooks/useOwnedNFTs';
import { SUI_NETWORK } from '../constants/sui';
import './NFTCard.css';

interface NFTCardProps {
    nft: CheckInNFT;
}

const NFTCard: React.FC<NFTCardProps> = ({ nft }) => {
    const formatDate = (timestamp: number) => {
        if (!timestamp) return 'Không rõ';
        return new Date(timestamp).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const explorerUrl = `https://suiscan.xyz/${SUI_NETWORK}/object/${nft.objectId}`;

    return (
        <div className="nft-card card">
            <div className="nft-card-image">
                {nft.eventImageUrl ? (
                    <img
                        src={nft.eventImageUrl}
                        alt={nft.eventName}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/default-event.jpg';
                        }}
                    />
                ) : (
                    <div className="nft-card-placeholder">
                        <span>🎫</span>
                    </div>
                )}
                <div className="nft-badge">NFT</div>
            </div>

            <div className="nft-card-content">
                <h3 className="nft-card-title">{nft.eventName || 'Check-in NFT'}</h3>

                <div className="nft-card-info">
                    <div className="nft-info-item">
                        <MapPin size={14} weight="fill" />
                        <span>{nft.eventLocation || 'Không rõ địa điểm'}</span>
                    </div>
                    <div className="nft-info-item">
                        <Calendar size={14} weight="fill" />
                        <span>{formatDate(nft.checkedInAt)}</span>
                    </div>
                </div>

                <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nft-card-link"
                >
                    Xem trên Sui Explorer
                    <ArrowSquareOut size={14} />
                </a>
            </div>
        </div>
    );
};

export default NFTCard;
