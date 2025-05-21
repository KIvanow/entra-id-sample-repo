import { StreamingCredentialsProvider } from '@redis/client/dist/lib/authx';
import TestUtils from '@redis/test-utils';
export declare const testUtils: TestUtils;
export declare const GLOBAL: {
    CLUSTERS: {
        PASSWORD_WITH_REPLICAS: {
            serverArguments: string[];
            numberOfMasters: number;
            numberOfReplicas: number;
            clusterConfiguration: {
                defaults: {
                    credentialsProvider: StreamingCredentialsProvider;
                };
            };
        };
    };
};
//# sourceMappingURL=test-utils.d.ts.map