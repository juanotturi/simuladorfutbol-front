import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { Team } from '../models/team.model';
import { MatchResult } from '../models/match-result.model';
import { Player } from '../models/player.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private BASE_URL = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  /**
   * Trae todos los equipos
   */
  getTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.BASE_URL}/teams`);
  }

  /**
   * Trae un equipo por su id (opcional)
   */
  getTeamById(id: number): Observable<Team> {
    return this.http.get<Team>(`${this.BASE_URL}/teams/${id}`);
  }

  /**
   * Recibe scoreA y scoreB y devuelve los goles de cada equipo
   */
  getMatchResult(scoreA: number, scoreB: number): Observable<MatchResult> {
    return this.http.get<MatchResult>(`${this.BASE_URL}/playMatch`, {
      params: {
        scoreA: scoreA,
        scoreB: scoreB
      }
    });
  }

  getPlayersByTeam(teamId: number) {
    return this.http.get<Player[]>(`${this.BASE_URL}/players/team/${teamId}`);
  }

  hasPlayers(teamId: number) {
    return this.getPlayersByTeam(teamId).pipe(
      map(players => (players?.length ?? 0) > 0),
      catchError(() => of(false))
    );
  }

  getRandomScorer(teamId: number, isPenalty: boolean = false) {
    return this.http.get<Player>(
      `${this.BASE_URL}/players/team/${teamId}/random-scorer?isPenalty=${isPenalty}`
    );
  }
}
