import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Team } from '../models/team.model';
import { MatchResult } from '../models/match-result.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private BASE_URL = 'http://localhost:8080';  

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
}
