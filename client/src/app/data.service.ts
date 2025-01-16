import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = 'http://localhost:5000/scrape'; // Replace with your backend API URL

  constructor(private http: HttpClient) { }

  sendData(exportCountry: string, destinationCountry: string, product: string): Observable<any> {
    const requestBody = { exportCountry, destinationCountry, product };
    return this.http.post<any>(this.apiUrl, requestBody);
  }

  private goodsurl = 'http://localhost:5000/goodsscrape';
  getGoodsData() {
    return this.http.get<any>(this.goodsurl);
  }

  private countryurl = 'http://localhost:5000/scrapeCountryList';
  getCountries() {
    return this.http.get<any>(this.countryurl);
  }
}
