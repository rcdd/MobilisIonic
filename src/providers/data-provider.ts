import { Injectable } from '@angular/core';
import 'rxjs/Rx';
import { DatabaseProvider } from './database-provider';
import { Http } from '@angular/http';

import 'moment';

declare var moment: any;

@Injectable()
export class DataProvider {

    public lines: any = [];
    public stops: any[] = [];
    public loading: number = 0;

    constructor(private http: Http, private db: DatabaseProvider) {
        this.db.init();
    }

    async getStops() {
        return this.stops;
    }

    async planningRoute(origin: any, destination: any) {
        //http://194.210.216.191/otp/routers/default/plan?fromPlace=39.73983136620544%2C-8.804597854614258&toPlace=39.74448420653371%2C-8.798589706420898&time=5%3A27pm&date=05-01-2017&mode=TRANSIT%2CWALK&maxWalkDistance=750
        let resp = await this.http.get(`http://194.210.216.191/otp/routers/default/plan?fromPlace=` + origin + `&toPlace=` + destination + `&time=5%3A27pm&date=05-01-2017&mode=TRANSIT%2CWALK&maxWalkDistance=750`).toPromise();
        console.log("planningRoute", resp.json());
        return resp.json();
    }

    async getDataFromServer(): Promise<any> {
        this.loading = 0;
        return new Promise((resolve, reject) => {
            this.isUpdated().then((up) => {
                //console.log("up", up);
                if (!up) {
                    console.log("DB Not updated!");
                    console.log("Innit download...");
                    return this.getRoutes().then(() => {
                        this.loading = 10;
                        return this.getStationsFromBusLines().then(() => {
                            this.dataInfoToDB();
                            console.log("Download DONE!", this.stops);
                        })
                    });
                }
            }).then(() => {
                this.loading = 80;
                return this.getStopsFromDB().then((stops) => {
                    //this.loading = 100;
                    //console.log("Stops", Object.keys(stops).length);
                    console.log("DB updated!");
                    resolve(this.stops)
                })
            });
        }).then((stops) => {
            //console.log("return promise then", Object.keys(this.stops).length);
            return this.stops;
        });
    }

    async isUpdated() {
        return await this.db.query("SELECT * FROM SETTINGS")
            .then(res => {
                let diff = (moment(new Date(), "YYYYMMDD").diff(res.rows.item(0).value, 'days'));
                //console.log("Diff time: ", diff);
                if (diff == 0) {
                    return true;
                } else {
                    return false;
                }
            })
            .catch(err => {
                console.log("Error: ", err);
            });

    }

    async DBDropTable(tableName: string) {
        await this.db.query("DROP TABLE " + tableName)
            .then(res => {
                console.log("Table Dropped: ", res);
            })
            .catch(err => {
                console.log("Error: ", err);
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

    async getStopsFromBusLine(_id: any) {
        let id = _id.split(":");
        let stops: any;
        return this.db.query("SELECT * FROM ID_" + id[1])
            .then(res => {
                stops = res;
                console.dir(stops);
                return stops;
            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }
    ////////////////////////////////////// CENAS FIXES  //////////////////////////////////////////////////////////

    async getRoutes() {
        let resp = await this.http.get(`http://194.210.216.191/otp/routers/default/index/routes`).toPromise();
        for (let route of resp.json()) {
            this.lines.push(route);
            this.loading += 5;
        }
        await this.createStorageLines();
    }

    async getStationsFromBusLines() {
        for (let route of this.lines) {
            this.loading += 5;
            let stops = await this.http.get("http://194.210.216.191/otp/routers/default/index/routes/" + route.id + "/stops").toPromise();
            await this.createStorageStops(route, stops.json());
        }
    }

    async createStorageLines() {
        await this.DBDropTable("BUSLINES");

        await this.db.query("CREATE TABLE IF NOT EXISTS BUSLINES (AGENCYNAME TEXT, IDLINE TEXT, LONGNAME TEXT, MODE TEXT, SHORTNAME TEXT)")
            .then(res => {
                this.lines.forEach(route => {
                    this.loading += 1;
                    this.db.query("INSERT INTO BUSLINES (AGENCYNAME, IDLINE, LONGNAME, MODE, SHORTNAME) VALUES(?,?,?,?,?);", [route.agencyName, route.id, route.longName, route.mode, route.shortName]).then(res => {
                        // console.dir(res);
                    })
                        .catch(err => {
                            console.log("Error: ", err);
                        });
                });

            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }

    async createStorageStops(route: any, stops: any) {
        let id = route.id.split(":");

        await this.DBDropTable("ID_" + id[1]);

        await this.db.query("CREATE TABLE IF NOT EXISTS ID_" + id[1] + " (name TEXT, id TEXT, lat TEXT, lon TEXT)")
            .then(res => {
                stops.forEach(stp => {
                    //console.log("inserir linha " + id[1]);
                    this.db.query("INSERT INTO ID_" + id[1] + " (name, id, lat, lon) VALUES(?,?,?,?);", [stp.name, stp.id, stp.lat, stp.lon])
                });
            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }

    async dataInfoToDB() {
        await this.DBDropTable("SETTINGS");

        await this.db.query("CREATE TABLE IF NOT EXISTS SETTINGS (name TEXT, value TEXT)")
            .then(res => {
                this.db.query("INSERT INTO SETTINGS (name, value) VALUES(?,?);", ['timestamp', new Date().toISOString()])
            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }

    async getStopsFromDB() {
        return new Promise((resolve, reject) => {
            this.db.query("SELECT * FROM BUSLINES")
                .then(res => {
                    //console.log("BUSLINES:", res);
                    for (let i = 0; i < res.rows.length; i++) {
                        //console.log("BUSLINE " + res.rows.item(i).IDLINE);
                        let id = res.rows.item(i).IDLINE.split(":");
                        this.db.query("SELECT * FROM ID_" + id[1])
                            .then(resp => {
                                let stop: any[] = [];
                                //console.log("Stops from line " + id[1], resp.rows);
                                for (let i = 0; i < resp.rows.length; i++) {
                                    //console.log("stop cenas", resp.rows.item(i));
                                    stop.push(resp.rows.item(i))
                                }
                                this.stops[res.rows.item(i).IDLINE] = {};
                                this.stops[res.rows.item(i).IDLINE].id = res.rows.item(i).IDLINE;
                                this.stops[res.rows.item(i).IDLINE].longName = res.rows.item(i).LONGNAME;
                                this.stops[res.rows.item(i).IDLINE].shortName = res.rows.item(i).SHORTNAME;
                                this.stops[res.rows.item(i).IDLINE].stops = stop;
                                this.loading += 1;
                                if (Object.keys(this.stops).length == res.rows.length) {
                                    resolve(this.stops);
                                }
                            })
                            .catch(err => {
                                console.log("Error: ", err);
                            })
                    }
                })
                .catch(err => {
                    console.log("Error: ", err);
                })
        }).then(() => {
            //console.log("Stops in getStopsFromDB", Object.keys(this.stops).length);
            return this.stops;
        });
    }

}