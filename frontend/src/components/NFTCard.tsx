/**
 * NFT Card Component - Photo-first check-in NFT card
 */
import React, { useState } from 'react';
import { MapPin, Calendar, ArrowSquareOut, Image } from '@phosphor-icons/react';
import type { CheckInNFT } from '../hooks/useOwnedNFTs';
import { SUI_NETWORK } from '../constants/sui';
import './NFTCard.css';

interface NFTCardProps {
    nft: CheckInNFT;
}

const NFTCard: React.FC<NFTCardProps> = ({ nft }) => {
    const [imgError, setImgError] = useState(false);

    const formatDate = (timestamp: number) => {
        if (!timestamp) return 'Không rõ';
        return new Date(timestamp).toLocaleDateString('vi-VN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const explorerUrl = `https://suiscan.xyz/${SUI_NETWORK}/object/${nft.objectId}`;
    const hasImage = !!nft.eventImageUrl && !imgError;

    // Initials for placeholder
    const initials = (nft.eventName || 'NFT')
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || '')
        .join('');

    return (
        <div className="nft-card">
            {/* Image / Placeholder */}
            <div className="nft-card-visual">
                {hasImage ? (
                    <img
                        src={nft.eventImageUrl}
                        alt={nft.eventName}
                        className="nft-card-img"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="nft-card-no-img">
                        <span className="nft-no-img-initials">{initials}</span>
                        <div className="nft-no-img-icon">
                            <Image size={20} weight="thin" />
                            <span>Chưa có ảnh</span>
                        </div>
                    </div>
                )}

                {/* Overlay gradient */}
                <div className="nft-card-overlay" />

                {/* NFT badge */}
                <span className="nft-badge-pill">NFT</span>
            </div>

            {/* Info */}
            <div className="nft-card-body">
                <h3 className="nft-card-name">{nft.eventName || 'Check-in NFT'}</h3>

                <div className="nft-card-meta">
                    {nft.eventLocation && (
                        <div className="nft-meta-row">
                            <MapPin size={13} weight="fill" />
                            <span>{nft.eventLocation}</span>
                        </div>
                    )}
                    {nft.checkedInAt > 0 && (
                        <div className="nft-meta-row">
                            <Calendar size={13} weight="fill" />
                            <span>{formatDate(nft.checkedInAt)}</span>
                        </div>
                    )}
                </div>

                <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nft-explorer-link"
                >
                    Xem trên Sui Explorer
                    <ArrowSquareOut size={13} />
                </a>
            </div>
        </div>
    );
};

export default NFTCard;
