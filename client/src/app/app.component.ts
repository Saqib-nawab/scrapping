import { Component } from '@angular/core';
import { DataService } from './data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  exportCountry = '';
  destinationCountry = '';
  product = '';
  responseData: any;

  constructor(private dataService: DataService) { }

  onSubmit() {
    this.dataService.sendData(this.exportCountry, this.destinationCountry, this.product)
      .subscribe(response => {
        this.responseData = response; // Handle response if needed
      }, error => {
        console.error('Error:', error);
      });
  }
}
