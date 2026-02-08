/// Module: event_checkin
/// A module for minting check-in NFTs for events on the Sui blockchain
module event_checkin::checkin_nft {
    use std::string::{Self, String};
    use sui::event;

    /// CheckInNFT - NFT representing a check-in at an event
    public struct CheckInNFT has key, store {
        id: UID,
        /// Event ID from the backend
        event_id: String,
        /// Event name
        event_name: String,
        /// Event location
        event_location: String,
        /// Event image URL
        event_image_url: String,
        /// User's wallet address who checked in
        owner_address: address,
        /// Timestamp when check-in occurred
        checked_in_at: u64,
    }

    /// Event emitted when a check-in NFT is minted
    public struct CheckInMinted has copy, drop {
        nft_id: ID,
        event_id: String,
        event_name: String,
        owner: address,
        checked_in_at: u64,
    }

    /// Mint a new check-in NFT for an event
    public entry fun mint_checkin(
        event_id: vector<u8>,
        event_name: vector<u8>,
        event_location: vector<u8>,
        event_image_url: vector<u8>,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let timestamp = sui::clock::timestamp_ms(clock);

        let nft = CheckInNFT {
            id: object::new(ctx),
            event_id: string::utf8(event_id),
            event_name: string::utf8(event_name),
            event_location: string::utf8(event_location),
            event_image_url: string::utf8(event_image_url),
            owner_address: sender,
            checked_in_at: timestamp,
        };

        event::emit(CheckInMinted {
            nft_id: object::id(&nft),
            event_id: string::utf8(event_id),
            event_name: string::utf8(event_name),
            owner: sender,
            checked_in_at: timestamp,
        });

        transfer::transfer(nft, sender);
    }

    /// View functions for NFT metadata
    public fun event_id(nft: &CheckInNFT): &String {
        &nft.event_id
    }

    public fun event_name(nft: &CheckInNFT): &String {
        &nft.event_name
    }

    public fun event_location(nft: &CheckInNFT): &String {
        &nft.event_location
    }

    public fun checked_in_at(nft: &CheckInNFT): u64 {
        nft.checked_in_at
    }

    public fun owner_address(nft: &CheckInNFT): address {
        nft.owner_address
    }
}
