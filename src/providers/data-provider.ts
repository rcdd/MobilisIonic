import { Injectable } from '@angular/core';
import 'rxjs/Rx';
import { DatabaseProvider } from './database-provider';
import { Http, Response } from '@angular/http';

@Injectable()
export class DataProvider {

    public stops: any;
    public busLines: any;
    public isReady: boolean;
    public routesTest: any;

    constructor(private http: Http, private db: DatabaseProvider) {
        this.isReady = false;
        this.stops = null;
        this.busLines = null;
        this.routesTest = [];
        this.db.init();
        this.getRoutes();
        this.initData();
    }


    getStopsStorage() {
        if (this.stops)
            return this.stops;
    }

    getbusLinesStorage() {
        if (this.busLines)
            return this.busLines;
    }

    getStops() {
        /* if (this.stops) {
             return Promise.resolve(this.stops);
         }*/

        /*return new Promise(resolve => {
          this.http.get('http://194.210.216.191/otp/routers/default/index/stops')
            .map(res => res.json())
            .subscribe(data => {
              this.stops = data;
              resolve(this.stops);
            });
        });*/
        return this.db.query("SELECT * FROM STOPS")
            .then(res => {
                this.stops = [];
                this.stops = res;
                console.dir(this.stops);
                return this.stops;
            })
            .catch(err => {
                console.log("Error: ", err);
            });

    }
    getBusLines() {
        /* if (this.busLines) {
             return Promise.resolve(this.busLines);
         }*/

        return this.db.query("SELECT * FROM BUSLINES")
            .then(res => {
                this.busLines = [];
                this.busLines = res;
                console.dir(this.busLines);
                return this.busLines;
            })
            .catch(err => {
                console.log("Error: ", err);
            });

    }

    initData() {
        // stops
        this.http.get('http://194.210.216.191/otp/routers/default/index/stops').map(res => res.json()).subscribe(data => {
            this.stops = data;
            //console.dir(this.stops);
            this.queryDbDelete("STOPS");
            this.queryDbAddStops();
            this.isReady = true;
            /*this.navController.push(HomePage, {
          stops: this.stops
        })*/
            console.log("Stops are available!");
            console.dir(this.stops);
        });
        //busLines
        this.http.get(`http://194.210.216.191/otp/routers/default/index/routes`).map(res => res.json()).subscribe(data => {
            this.busLines = data;
            //console.dir(this.busLines);
            this.queryDbDelete("BUSLINES");
            this.queryDbAddBusLines();
            /*this.navController.push(HomePage, {
              busLines: this.busLines
            })*/
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
                // console.dir(res);
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
                // console.dir(res);
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
    }

    getRoutes() {
        this.http.get(`http://194.210.216.191/otp/routers/default/index/routes`)
            .map((res: Response) => res.json()).subscribe(a => {
                a.forEach(route => {
                    this.routesTest[route.id] = {};
                });
                this.getStationsFromBusLines();
            });
    }

    getStationsFromBusLines() {
        for (let route in this.routesTest) {
            this.http.get("http://194.210.216.191/otp/routers/default/index/routes/" + route + "/stops")
                .map((res: Response) => res.json()).subscribe(stops => {
                    this.createStorage(route, stops);
                });
        }
    }

    createStorage(route: any, stops: any) {

        let id = route.split(":");
        this.db.query("DROP TABLE ID" + id[1]).then(res => {
            // console.log("Result: ", res);
        })
            .catch(err => {
                console.log("Error: ", err);
            });
        this.db.query("CREATE TABLE IF NOT EXISTS ID" + id[1] + " (name TEXT, id TEXT, lat TEXT, lon TEXT)")
            .then(res => {
                // console.log("Result: ", res);
                stops.forEach(stp => {
                    this.db.query("INSERT INTO ID" + id[1] + " (name, id, lat, lon) VALUES(?,?,?,?);", [stp.name, stp.id, stp.lat, stp.lon])
                });

            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }

    getStopsFromBusLine(_id: any):any {
        let id = _id.split(":");
        let stops: any;
        return this.db.query("SELECT * FROM ID" + id[1])
            .then(res => {
                stops = res;
                console.dir(stops);
                return stops;
            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }

}