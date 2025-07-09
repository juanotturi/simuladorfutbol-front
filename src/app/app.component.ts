import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationService } from './services/navigation.service';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'simuladorfutbol-front';

  constructor(
    private router: Router,
    private navigationService: NavigationService
  ) {}

  goToTeams() {
    this.router.navigate(['/teams']).then(() => {
      this.navigationService.requestTeamsToggle();
    });
  }
  
  goToPlay() {
    this.navigationService.setTeamsVisibility(false);
    this.router.navigate(['/play-match']);
  }
}
