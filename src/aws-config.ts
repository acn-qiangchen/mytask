import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'ap-northeast-1_m6oFvOQJM',
      userPoolClientId: '3rtdi9u50752gb0r783t7lbj0p',
      identityPoolId: 'ap-northeast-1:5ddaf669-d06f-46a5-9791-6381491fd32d',
    },
  },
});
