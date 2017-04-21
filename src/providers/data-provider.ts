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

    async getDataFromServer(): Promise<any> {
        this.loading = 0;
        await this.isUpdated().then((up) => {
            //console.log("up", up);
            if (!up) {
                console.log("DB Not updated!");
                console.log("Innit download...");
                this.getRoutes().then(() => {
                    this.loading = 30;
                    this.getStationsFromBusLines().then(() => {
                        this.loading = 75;
                        this.dataInfoToDB();
                        console.log("Download DONE!", this.stops);
                        this.getStopsFromDB().then(() => {
                            this.loading = 100;
                        });
                    })
                });
            } else {
                this.loading = 90;
                this.getStopsFromDB().then(() => {
                    this.loading = 100;
                });
                console.log("DB updated!");
            }

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

    queryDbDrop(tableName: string) {
        this.db.query("DROP TABLE " + tableName)
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
        }
        await this.createStorageLines();
    }

    async getStationsFromBusLines() {
        for (let route of this.lines) {
            let stops = await this.http.get("http://194.210.216.191/otp/routers/default/index/routes/" + route.id + "/stops").toPromise();
            await this.createStorageStops(route, stops.json());
        }
    }

    async createStorageLines() {
        await this.db.query("DROP TABLE BUSLINES").then(res => {
            // console.log("Result: ", res);
        })
            .catch(err => {
                console.log("Error: ", err);
            });
        await this.db.query("CREATE TABLE IF NOT EXISTS BUSLINES (AGENCYNAME TEXT, IDLINE TEXT, LONGNAME TEXT, MODE TEXT, SHORTNAME TEXT)")
            .then(res => {
                this.lines.forEach(route => {
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

        this.db.query("DROP TABLE ID_" + id[1]).then(res => {
            // console.log("Result: ", res);
        })
            .catch(err => {
                console.log("Error: ", err);
            });

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
        this.db.query("DROP TABLE SETTINGS").then(res => {
            // console.log("Result: ", res);
        })
            .catch(err => {
                console.log("Error: ", err);
            });

        await this.db.query("CREATE TABLE IF NOT EXISTS SETTINGS (name TEXT, value TEXT)")
            .then(res => {
                this.db.query("INSERT INTO SETTINGS (name, value) VALUES(?,?);", ['timestamp', new Date().toISOString()])
            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }

    async getStopsFromDB() {
        return await this.db.query("SELECT * FROM BUSLINES")
            .then(res => {
                //console.log("BUSLINES:", res);
                for (let i = 0; i < res.rows.length; i++) {
                    //console.log("BUSLINE " + res.rows.item(i).IDLINE);
                    let id = res.rows.item(i).IDLINE.split(":");
                    this.db.query("SELECT * FROM ID_" + id[1])
                        .then(resp => {
                            let stops: any[] = [];
                            //console.log("Stops from line " + id[1], resp.rows);
                            for (let i = 0; i < resp.rows.length; i++) {
                                //console.log("stop cenas", resp.rows.item(i));
                                stops.push(resp.rows.item(i))
                            }
                            this.stops[res.rows.item(i).IDLINE] = {};
                            this.stops[res.rows.item(i).IDLINE].id = res.rows.item(i).IDLINE;
                            this.stops[res.rows.item(i).IDLINE].longName = res.rows.item(i).LONGNAME;
                            this.stops[res.rows.item(i).IDLINE].shortName = res.rows.item(i).SHORTNAME;
                            this.stops[res.rows.item(i).IDLINE].stops = stops;
                        })
                        .catch(err => {
                            console.log("Error: ", err);
                        });
                }
            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }

}