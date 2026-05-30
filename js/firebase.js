const firebase = globalThis.firebase;

if (!firebase) {
  throw new Error('Firebase SDK não foi carregado antes do módulo da aplicação.');
}

const firebaseConfig = {
  apiKey: 'AIzaSyAbWl64wzFmDJ26XhgH41I5Gdp1F2l3Jmg',
  authDomain: 'meu-controle-financeiro-d01e9.firebaseapp.com',
  projectId: 'meu-controle-financeiro-d01e9',
  storageBucket: 'meu-controle-financeiro-d01e9.appspot.com',
  messagingSenderId: '1028629675716',
  appId: '1:1028629675716:web:7d0e279b8cec22f2e4d391',
  measurementId: 'G-7463KD4JBB'
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export { firebase };
export const auth = firebase.auth();
export const db = firebase.firestore();
