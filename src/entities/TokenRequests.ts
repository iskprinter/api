export interface TokenGetRequest { };

export interface TokenPostRequest {
    proofType: string;
    proof: string;
};

export interface TokenVerificationResponse {
    CharacterID: number;
    CharacterName: string;
    ExpiresOn: string;
    Scopes: string;
    TokenType: string;
    CharacterOwnerHash: string;
    IntellectualProperty: string;
};
