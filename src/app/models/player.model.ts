export interface Player {
  id: number;
  idTeam: number;
  name: string;
  goalProbability: number;
  position: string;
  penaltyOrder: number;
  isPenaltyShooter: boolean;
}