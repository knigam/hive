import {
  PlayerData,
  PlayerState,
  ICreateGameRequest,
  IJoinGameRequest,
  IStartGameRequest,
  ISelectPieceRequest,
  IMovePieceRequest,
} from "./types";

export interface Methods<T> {
  createGame(userData: PlayerData, request: ICreateGameRequest): T;
  joinGame(state: T, userData: PlayerData, request: IJoinGameRequest): string | void;
  startGame(state: T, userData: PlayerData, request: IStartGameRequest): string | void;
  selectPiece(state: T, userData: PlayerData, request: ISelectPieceRequest): string | void;
  movePiece(state: T, userData: PlayerData, request: IMovePieceRequest): string | void;
  getUserState(state: T, userData: PlayerData): PlayerState;
}
