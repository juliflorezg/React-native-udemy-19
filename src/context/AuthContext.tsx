import React, {createContext, useReducer, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import cafeAPI from '../api/cafeAPI';
import {
  LoginData,
  LoginResponse,
  RegisterData,
  Usuario,
} from '../interfaces/appInterfaces';
import {authReducer, AuthState} from './authReducer';

interface AuthContextProps {
  errorMessage: string;
  token: string | null;
  user: Usuario | null;
  status: 'checking' | 'authenticated' | 'not-authenticated';
  signUp: (registerData: RegisterData) => void;
  signIn: (loginData: LoginData) => void;
  removeError: () => void;
  logout: () => void;
}

const authInitialState: AuthState = {
  status: 'checking',
  token: null,
  user: null,
  errorMessage: '',
};

export const AuthContext = createContext({} as AuthContextProps);

export const AuthContextProvider = ({
  children,
}: {
  children: JSX.Element | JSX.Element[];
}) => {
  const [state, dispatch] = useReducer(authReducer, authInitialState);

  useEffect(() => {
    const readTokenFromStorage = async () => {
      try {
        const token = await AsyncStorage.getItem('token');

        console.log({token});

        //* no token means the user is not authenticated
        if (!token) {
          return dispatch({type: 'notAuthenticated'});
        }

        //There's a token
        const res = await cafeAPI.get('/auth');
        if (res.status !== 200) {
          return dispatch({type: 'notAuthenticated'});
        }
        //? here we set a new token with new expiration time
        await AsyncStorage.setItem('token', res.data.token);
        dispatch({
          type: 'signUp',
          payload: {token: res.data.token, user: res.data.usuario},
        });
      } catch (error) {
        console.log(error);
      }
    };

    readTokenFromStorage();
  }, []);

  // const validateToken = () => {};

  const signUp = async ({nombre, correo, password}: RegisterData) => {
    try {
      const res = await cafeAPI.post<LoginResponse>('/usuarios', {
        correo,
        nombre,
        password,
      });
      dispatch({
        type: 'signUp',
        payload: {
          token: res.data.token,
          user: res.data.usuario,
        },
      });
      // now, we have to set the token in AsyncStorage
      await AsyncStorage.setItem('token', res.data.token);
    } catch (error) {
      console.error(error);
      console.error(JSON.stringify(error.response, null, 2));
      const errors = error.response.data.errors.map(err => err.msg);
      dispatch({
        type: 'addError',
        payload: errors[0] || 'Please check the information',
      });
      console.log(errors); //['el nombre es obligatorio']
    }
  };
  const signIn = async ({correo, password}: LoginData) => {
    try {
      const {
        data: {token, usuario},
      } = await cafeAPI.post<LoginResponse>('/auth/login', {
        correo,
        password,
      });
      dispatch({type: 'signUp', payload: {token, user: usuario}});

      await AsyncStorage.setItem('token', token);

      // console.log(res.data);
    } catch (error) {
      console.log(error.response.data.msg);
      dispatch({
        type: 'addError',
        payload: error.response.data.msg || 'Wrong credentials',
      });
    }
  };
  const removeError = () => dispatch({type: 'removeError'});
  const logout = async () => {
    await AsyncStorage.removeItem('token');
    dispatch({type: 'logOut'});
  };
  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        removeError,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};
