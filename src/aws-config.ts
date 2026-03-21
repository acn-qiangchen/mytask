import { Amplify } from 'aws-amplify';

// TODO: Replace with actual MyTask Cognito resource IDs after AWS setup
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'ap-northeast-1_XXXXXXXXX',
      userPoolClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
      identityPoolId: 'ap-northeast-1:00000000-0000-0000-0000-000000000000',
    },
  },
});
