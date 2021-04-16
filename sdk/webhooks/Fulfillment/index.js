/**
 * Copyright 2021 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const functions = require('firebase-functions');
const {
  conversation,
  Suggestion,
  Simple,
  Table,
} = require('@assistant/conversation');
const SunCalc = require('suncalc');
const spacetime = require('spacetime');

const app = conversation();

app.handle('location_granted', (conv) => {
  const {latitude, longitude} = conv.device.currentLocation.coordinates;
  if (!latitude) {
    conv.add('Sorry, I cannot get your location right now.');
    return;
  }
  const {
    sunrise,
    sunriseEnd,
    sunsetStart,
    sunset,
  } = SunCalc.getTimes(new Date(), latitude, longitude);
  // Sunrise and Sunset are in GMT. Need to offset based on timezone.
  const {id} = conv.request.device.timeZone;
  let sunriseSpacetime = spacetime(sunrise);
  sunriseSpacetime = sunriseSpacetime.goto(id); // Set timezone
  let sunriseEndSpacetime = spacetime(sunriseEnd);
  sunriseEndSpacetime = sunriseEndSpacetime.goto(id); // Set timezone
  let sunsetStartSpacetime = spacetime(sunsetStart);
  sunsetStartSpacetime = sunsetStartSpacetime.goto(id); // Set timezone
  let sunsetSpacetime = spacetime(sunset);
  sunsetSpacetime = sunsetSpacetime.goto(id); // Set timezone
  const locationLabel = conv.device.currentLocation.postalAddress.locality;

  conv.add(new Simple({
    speech: `<speak>
      Today in ${locationLabel}, the sunrise is between
      <say-as interpret-as="time" format="hms12">
        ${sunriseSpacetime.format('{time}')}
      </say-as>
      and
      <say-as interpret-as="time" format="hms12">
        ${sunriseEndSpacetime.format('{time}')}
      </say-as>.
      The sunset is between
      <say-as interpret-as="time" format="hms12">
        ${sunsetStartSpacetime.format('{time}')}
      </say-as>
      and
      <say-as interpret-as="time" format="hms12">
        ${sunsetSpacetime.format('{time}')}
      </say-as>.
      </speak>`.replace(/\n/g, ''),
    text: `Here are the sunrise and sunset times for ${locationLabel}.`,
  }));
  conv.add('Is there anything else I can do?');
  conv.add(new Table({
    title: `${locationLabel}`,
    subtitle: 'Sunrise / Sunset times',
    columns: [{
      header: 'Sunrise 🌅',
    }, {
      header: 'Sunset 🌇',
    }],
    rows: [{
      cells: [{
        text: `${sunriseSpacetime.format('{time}')} - ` +
          `${sunriseEndSpacetime.format('{time}')}`,
      }, {
        text: `${sunsetStartSpacetime.format('{time}')} - ` +
          `${sunsetSpacetime.format('{time}')}`,
      }],
    }],
  }));
});

app.handle('moon_phase', (conv) => {
  // Get current phase
  const phase = SunCalc.getMoonIllumination(new Date());
  if (phase < 0.125) {
    conv.add('It is currently a New Moon.');
  } else if (phase < 0.25) {
    conv.add('The moon is currently a Waxing Crescent.');
  } else if (phase < 0.375) {
    conv.add('The moon is currently in its First Quarter.');
  } else if (phase < 0.5) {
    conv.add('The moon is currently a Waxing Gibbous.');
  } else if (phase < 0.625) {
    conv.add('The moon is currently Full.');
  } else if (phase < 0.75) {
    conv.add('The moon is currently a Waning Gibbous.');
  } else if (phase < 0.875) {
    conv.add('The moon is currently in its Last Quarter.');
  } else {
    conv.add('The moon is currently a Waning Crescent.');
  }
  conv.add('Is there anything else I can do?');
  conv.add(new Suggestion({title: 'Sun Forecast'}));
});

app.handle();

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
