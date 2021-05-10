require('dotenv').config()
const moment = require('moment');
const cron = require('node-cron');
const axios = require('axios');
const notifier = require('./notifier');
/**
Step 1) Enable application access on your gmail with steps given here:
 https://support.google.com/accounts/answer/185833?p=InvalidSecondFactor&visit_id=637554658548216477-2576856839&rd=1

Step 2) Enter the details in the file .env, present in the same folder

Step 3) On your terminal run: npm i && pm2 start vaccineNotifier.js

To close the app, run: pm2 stop vaccineNotifier.js && pm2 delete vaccineNotifier.js
 */

const PINCODE = process.env.PINCODE;
const EMAIL = process.env.EMAIL;
const AGE = process.env.AGE;
const MIN_AGE = process.env.MIN_AGE;
const MAX_AGE = process.env.MAX_AGE;
const DISTRICT_ID = process.env.DISTRICT_ID;
const VACCINE = process.env.VACCINE;
let validCenters = [];

async function main(){
    try {
        console.log("main called");
        cron.schedule('2 * * * *', async () => {
            console.log("Starting cron");
             await checkAvailability();
             console.log("Stopping cron");
        });
        // await checkAvailability();
    } catch (e) {
        console.log('an error occured: ' + JSON.stringify(e, null, 2));
        throw e;
    }
}

async function checkAvailability() {
    console.log("checkAvailability called");
    let datesArray = await fetchNext10Days();

    datesArray.forEach(async(date) => {
        getSlotsForDate(date);
        console.log("waiting");
    });
    
}

const getSlotsForDate = async(DATE) => {
    let config = {
        method: 'get',
        url: 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=' + DISTRICT_ID + '&date=' + DATE,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
            'accept': 'application/json',
            'Accept-Language': 'en_IN'
        },
    };

    console.log("url: ", config.url);
    let district_ids = DISTRICT_ID.split(',');

    for(let i=0; i<district_ids.length; i++){
        let district_id = district_ids[i];
        config.url = 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=' + district_id + '&date=' + DATE;
        // console.log(district_id, "url: ", config.url);
        let slots = await axios(config);
        let centers = slots.data.centers;
        centers.map(center => {
            center.sessions.map((session) => {
                if(
                    session.min_age_limit == MIN_AGE
                &&  session.available_capacity > 0 
                &&  session.vaccine == VACCINE
                ){
                    let validCenter = {
                        center: '',
                        district_name: center.district_name,
                        date: '',
                        vaccine: '',
                        available_capacity: ''
                    }
                    validCenter.center = center.name;
                    validCenter.date = session.date;
                    validCenter.vaccine = session.vaccine;
                    validCenter.available_capacity = session.available_capacity;
                    console.log("validcenter: ", validCenter);
                    validCenters.push(validCenter);
                }
            });
            
        });
    }
    console.log("validCenters: ", validCenters);
}

async function

notifyMe(validSlots){
    let slotDetails = JSON.stringify(validSlots, null, '\t');
    notifier.sendEmail(EMAIL, 'VACCINE AVAILABLE', slotDetails, (err, result) => {
        if(err) {
            console.error({err});
        }
    })
};

async function fetchNext10Days(){
    let dates = [];
    let today = moment();
    for(let i = 0 ; i < 1 ; i ++ ){
        let dateString = today.format('DD-MM-YYYY')
        dates.push(dateString);
        today.add(1, 'day');
    }
    return dates;
}


main()
    .then(() => {
        console.log('Vaccine availability checker started.');
        // console.log("validcenters: ", validCenters);
    });
