import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar, Splashscreen } from 'ionic-native';
import { NavController } from 'ionic-angular';
import { TabsPage } from '../pages/tabs/tabs';
import { DatabaseProvider } from '../providers/database-provider';
import { Http } from '@angular/http';
import { HomePage } from '../pages/home/home' 
import 'rxjs/add/operator/map';
import { DataProvider } from '../providers/data-provider';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage = TabsPage;

  // Session storage
  private stops: any;
  private busLines: any;

  constructor(platform: Platform,
    public db: DatabaseProvider,
    public http: Http,
    private navController: NavController,
    private DataProvider : DataProvider) {

    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();
      Splashscreen.hide();
      //this.ngOnStart();
    });
  }

  ngOnInit(): void {
    // Só para testar se mesmo que não tenha tabelas tempo e consegue criar ao iniciar a aplicação
    //this.db.init();
    this.queryDbDrop("STOPS");
    this.queryDbDrop("BUSLINES");
    this.createStorageStops();
    this.createStorageBusLines();
    this.DataProvider;
    //console.dir(this.DataProvider.loadStops());
  }

  queryDbDrop(tableName: string) {
        this.db.query("DROP TABLE " + tableName)
            .then(res => {
                // console.log("Result: ", res);
            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }

  createStorageStops() {
    this.db.query("CREATE TABLE IF NOT EXISTS STOPS (NAME TEXT, IDSTOP TEXT, LAT TEXT, LON TEXT)")
      .then(res => {
        //console.log("Result: ", res);
      })
      .catch(err => {
        console.log("Error: ", err);
      });
  }

  createStorageBusLines() {
    this.db.query("CREATE TABLE IF NOT EXISTS BUSLINES (AGENCYNAME TEXT, IDLINE TEXT, LONGNAME TEXT, MODE TEXT, SHORTNAME TEXT)")
      .then(res => {
       // console.log("Result: ", res);
      })
      .catch(err => {
        console.log("Error: ", err);
      });
  }

  /*initData() {
    // stops
    this.http.get('http://194.210.216.191/otp/routers/default/index/stops').map(res => res.json()).subscribe(data => {
      this.stops = data;
      //console.dir(this.stops);
      this.queryDbDelete("STOPS");
      this.queryDbAddStops();
          this.navController.push(HomePage, {
        stops: this.stops
      })
      console.log("Stops are available!");
      console.dir(this.stops);
    });
    //busLines
    this.http.get(`http://194.210.216.191/otp/routers/default/index/routes`).map(res => res.json()).subscribe(data => {
      this.busLines = data;
      //console.dir(this.busLines);
      this.queryDbDelete("BUSLINES");
      this.queryDbAddBusLines();
      this.navController.push(HomePage, {
        busLines: this.busLines
      })
      console.log("busLines are available!");
      console.dir(this.busLines);
    });
  }

  queryDbDrop(tableName: string) {
    this.db.query("DROP TABLE " + tableName)
      .then(res => {
       // console.log("Result: ", res);
      })
      .catch(err => {
        console.log("Error: ", err);
      });
  }

  queryDbAddStops() {
    // Store STOPS
    //console.log("Add stops to db");
    this.stops.forEach(stop => {
      this.db.query("INSERT INTO STOPS (NAME, IDSTOP, LAT, LON) VALUES(?,?,?,?);", [stop.name, stop.id, stop.lat, stop.lon]).then(res => {
        //console.dir(res);
      })
        .catch(err => {
          console.log("Error: ", err);
        });
    });
  }

  queryDbAddBusLines() {
    // Store BUSLINES
    //console.log("Add BusLines to db");
    this.busLines.forEach(busLine => {
      this.db.query("INSERT INTO BUSLINES (AGENCYNAME, IDLINE, LONGNAME, MODE, SHORTNAME) VALUES(?,?,?,?,?);", [busLine.agencyName, busLine.id, busLine.longName, busLine.mode, busLine.shortName]).then(res => {
        //console.dir(res);
      })
        .catch(err => {
          console.log("Error: ", err);
        });
    });
  }

  queryDbDelete(tableName: string) {
    this.db.query("DELETE FROM " + tableName)
      .then(res => {
       // console.log("Result: ", res);
      })
      .catch(err => {
        console.log("Error: ", err);
      });
  }*/

}
