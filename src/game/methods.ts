import {
  UserData,
  PlayerState as UserState,
  ISetupGameRequest,
  ISelectPieceRequest,
  IMovePieceRequest,
} from "./types";

export interface Context {
  rand(): number;
  randInt(limit?: number): number;
  time(): number;
}

export interface SuccessResponse {
  type: "success";
}
export interface ErrorResponse {
  type: "error";
  error?: string;
}
export type Response = SuccessResponse | ErrorResponse;
export const Response: {
  ok: () => SuccessResponse;
  error: (error?: string) => ErrorResponse;
} = {
  ok: () => ({
    type: "success",
  }),
  error: (error?: string) => ({
    type: "error",
    error,
  }),
};

export interface Methods<T> {
  createGame(gameId: string, userData: UserData): Promise<Response>;
  setupGame(
    state: T,
    userData: UserData,
    request: ISetupGameRequest
  ): Promise<Response>;
  playGame(state: T, userData: UserData): Promise<Response>;
  selectPiece(
    state: T,
    userData: UserData,
    request: ISelectPieceRequest
  ): Promise<Response>;
  movePiece(
    state: T,
    userData: UserData,
    request: IMovePieceRequest
  ): Promise<Response>;
  getUserState(state: T, userData: UserData): UserState;
}
