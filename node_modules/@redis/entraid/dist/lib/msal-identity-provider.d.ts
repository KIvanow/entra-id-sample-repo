import { AuthenticationResult } from '@azure/msal-node';
import { IdentityProvider, TokenResponse } from '@redis/client/dist/lib/authx';
export declare class MSALIdentityProvider implements IdentityProvider<AuthenticationResult> {
    private readonly getToken;
    constructor(getToken: () => Promise<AuthenticationResult>);
    requestToken(): Promise<TokenResponse<AuthenticationResult>>;
}
//# sourceMappingURL=msal-identity-provider.d.ts.map