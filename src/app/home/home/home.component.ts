import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `<h3>Bienvenido al Simulador de Fútbol</h3>`
})
export class HomeComponent {

}
