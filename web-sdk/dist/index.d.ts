/**
 * WeightCha Web SDK
 * Human verification via trackpad pressure detection
 */
export interface WeightChaConfig {
    apiKey: string;
    baseUrl?: string;
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
    debug?: boolean;
}
export interface ChallengeOptions {
    type?: 'pressure_pattern' | 'rhythm_test' | 'sustained_pressure' | 'progressive_pressure';
    difficulty?: 'easy' | 'medium' | 'hard';
    duration?: number;
    onSuccess?: (token: string) => void;
    onError?: (error: Error) => void;
    onCancel?: () => void;
}
export interface VerificationResult {
    success: boolean;
    token?: string;
    isHuman?: boolean;
    confidence?: number;
    error?: string;
}
export declare class WeightCha {
    private config;
    private initialized;
    private currentChallenge;
    constructor(config: WeightChaConfig);
    init(): Promise<void>;
    verify(containerId: string, options?: ChallengeOptions): Promise<VerificationResult>;
    validateToken(token: string): Promise<boolean>;
    private checkClientAvailability;
    private createChallenge;
    private renderUI;
    private bindEvents;
    private waitForVerification;
    private apiCall;
    private loadStyles;
    private getCSSStyles;
    private log;
}
