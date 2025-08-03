import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { NavigationService } from './services/navigation.service';
import { RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgClass],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'simuladorfutbol-front';
  currentRoute = '';

  constructor(
    private router: Router,
    private navigationService: NavigationService
  ) {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        this.currentRoute = e.urlAfterRedirects;
      });
  }

  isActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }

  goToHome() {
    this.router.navigate(['/home']);
  }

  goToTeams() {
    this.router.navigate(['/teams']).then(() => {
      this.navigationService.requestLoadTeams();
    });
  }

  goToPlay() {
    this.router.navigate(['/play-match']);
  }

  goToPlayTournament() {
    this.router.navigate(['/play-tournament']);
  }

  goToCreateTournament() {
    this.router.navigate(['/create-tournament']);
  }
}
