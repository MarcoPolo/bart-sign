import React, { useState, useEffect, useRef, useCallback } from "react";
import { BartStation, bartStations } from "./Stations";
import "./App.css";

import happybart from "./happybart.png";

type ETD = {
  length: string;
  minutes: string;
  hexcolor: string;
};

type BartLineETD = {
  abbreviation: string;
  destination: string;
  estimate: Array<ETD>;
};

type BartStationETD = {
  root: {
    station: Array<{
      abbr: string;
      etd: Array<BartLineETD>;
    }>;
  };
};

type TrainStatus = {
  eta_mins: number,
  car_count: number,
  is_new_boi: boolean,
}

type LineStatus = {
  trains: Array<TrainStatus>
  destination: string,
  // Note this is a color like "Blue" not a hex code. See this for the conversion: https://en.wikipedia.org/wiki/Module:Adjacent_stations/BART
  color: string
}

type StatinStatus = {
  platforms: Array<{
    platform_number: number,
    lines: Array<LineStatus>
  }>
}

// Example call to the new api
async function exampleFruitBart(station: BartStation) {
  let resp = await fetch(`https://bart.fruit.dev/info?station=${station}`)
  let stationStatus = await resp.json()
  // let stationStatus = await fetch(`https://api.fruit.dev/v1/bart?station=${station}`)
  console.log("Station status is", stationStatus)
}

exampleFruitBart("woak")

// class AppClassStyle extends React.Component {
//   state: { estimates: Array<number> } = { estimates: [] };
//   componentDidMount() {
//     allEstimatesForEveryTrain("woak", "s").then(
//       (allEstimates: Array<number>) => {
//         this.setState({ estimates: allEstimates });
//       }
//     );
//   }

//   shouldComponentUpdate(prevProps) {
//     if (prevProps.foo != this.props.foo) {
//       //... do something
//     }
//   }

//   render() {
//     console.log("Time estimates are", this.state.estimates);

//     const formattedTimeEstimates = this.state.estimates
//       .map((time: number) => `${time} minutes`)
//       .map((formattedString: string) => {
//         return <div>{formattedString}</div>;
//       });

//     return (
//       <div className="App">
//         <header className="App-header">
//           <p>Your next Bart train is leaving in </p>
//           {formattedTimeEstimates}
//         </header>
//       </div>
//     );
//   }
// }

function useInterval(callback: () => void, delay: number) {
  const savedCallback = useRef<Function>();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current && savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

type LocationInfo = {
  station: BartStation;
  dir: "s" | "n";
};
function hashToLocation(h: string): LocationInfo {
  const [station, dir] = h.substr(1).split("/");
  return {
    station: (station || "woak") as BartStation,
    dir: (dir || "s") as any
  };
}

function useHashLocation(): [
  LocationInfo,
  (info: Partial<LocationInfo>) => void
] {
  const [location, setLocation] = useState(
    hashToLocation(window.location.hash)
  );
  window.onhashchange = () => {
    setLocation(hashToLocation(window.location.hash));
  };

  const changeLocation = useCallback(
    (info: Partial<LocationInfo>) => {
      info = { ...location, ...info };
      window.location.hash = `${info.station}/${info.dir}`;
    },
    [location]
  );

  return [location, changeLocation];
}

async function postData(url = "", data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json"
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrer: "no-referrer", // no-referrer, *client
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  });
  return await response.json(); // parses JSON response into native JavaScript objects
}

const BartRow = ({
  etd,
  onSubmitNewBart
}: {
  etd: ETD;
  onSubmitNewBart: (color: string) => void;
}) => {
  const time = getMinutesFromETD(etd);
  const formattedString = `${time} minutes`;
  const bartBarWidth = `calc(100% - ${5 * time}px)`;
  const [submittedNewBart, setSubmittedNewBart] = useState(false);
  return (
    <div className="bart-row">
      <span className="time">{formattedString}</span>
      <div className="bart-bar-background">
        <div
          className="bart-bar"
          style={{
            width: bartBarWidth,
            background: etd.hexcolor
          }}
        >
          <img className="bart-icon" src={happybart} alt="bart, beep beep" />
        </div>
      </div>
      <button
        type="button"
        className="new-bart-btn"
        onClick={async () => {
          setSubmittedNewBart(true);
          try {
            await onSubmitNewBart(etd.hexcolor);
          } catch (e) {
            setSubmittedNewBart(false);
          }
        }}
        disabled={submittedNewBart}
      >
        {submittedNewBart ? "Thanks!" : "New Bart!"}
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [location, changeLocation] = useHashLocation();
  const [etds, setEtds] = useState<Array<ETD>>([]);
  console.log("Location is", location);

  const updateTrains = () => {
    allEtdsForEveryTrain(location.station || "woak", location.dir || "s").then(
      (allEstimates: Array<ETD>) => {
        setEtds(allEstimates);
      }
    );
  };

  // initial fetch without delay!
  useEffect(updateTrains, [location]);

  useInterval(updateTrains, 40 * 1000);

  console.log("ETDs are", etds);

  const formattedTimeEstimates = etds.map((etd: ETD, i: number) => (
    <BartRow
      etd={etd}
      onSubmitNewBart={async (color: string) => {
        await postData("https://marco-new-barts.builtwithdark.com/report", {
          station: location.station,
          direction: location.dir,
          lineColor: color
        });
      }}
      key={i}
    />
  ));

  return (
    <div className="App">
      <header className="App-header">
        <p>
          Your next Bart train from
          <select
            name="station"
            className="inline-select"
            onChange={v => changeLocation({ station: v.target.value as any })}
          >
            <option value="woak">West Oakland</option>
            {bartStations.map(station => (
              <option
                key={station}
                value={station}
                selected={station === location.station}
              >
                {station}
              </option>
            ))}
          </select>
          going
          <select
            name="dir"
            className="inline-select"
            onChange={v => changeLocation({ dir: v.target.value as any })}
          >
            <option value="s">south</option>
            <option selected={location.dir === "n"} value="n">
              north
            </option>
          </select>
          is leaving in
        </p>
        <div className="bart-times">{formattedTimeEstimates}</div>
      </header>
    </div>
  );
};

// http://api.bart.gov/api/etd.aspx?cmd=etd&dir=n&orig=WOAK&key=MW9S-E7SL-26DU-VV8V&json=y

// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
const allEtdsForEveryTrain = (
  station: BartStation,
  direction: "s" | "n"
): Promise<ETD[]> => {
  console.log(`You want to leave from ${station} going ${direction}`);
  const bartPromise: Promise<Response> = fetch(
    `https://api.bart.gov/api/etd.aspx?cmd=etd&dir=${direction}&orig=${station}&key=MW9S-E7SL-26DU-VV8V&json=y`
  );
  console.log(bartPromise);

  const estimates = bartPromise
    .then((resp: Response) => {
      if (resp.ok) {
        // https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
        return resp.json();
      } else {
        throw new Error("I didn't get the info from bart :(");
      }
    })
    .then((bartStationETD: BartStationETD) => {
      const etdsForStation = bartStationETD.root.station[0].etd;
      const allEtdsForEveryTrain: ETD[] = etdsForStation
        .map(train => train.estimate)
        .flat()
        .sort(
          (a, b) =>
            convertStrMinutesToNumMinutes(a.minutes) -
            convertStrMinutesToNumMinutes(b.minutes)
        );

      console.log("All etds: ", allEtdsForEveryTrain);
      return allEtdsForEveryTrain;
    });
  return estimates;
};

const convertStrMinutesToNumMinutes = (strMinutes: string) => {
  return strMinutes === "Leaving" ? 0 : parseInt(strMinutes);
};

const getMinutesFromETD = (etd: ETD) => {
  return convertStrMinutesToNumMinutes(etd.minutes);
};

// Overview
// 1. Get the data ✅
// 2. parse the data/format the data ✅
// 3. Show it off!
// ---
// 4. Allow opt url pararmeters (http://localhost:3000/#woak/s)

// https://bart.marcopolo.io/

// http://qwantz.com/

export default App;

// function bar() {
//   console.log("Hello from bar");
//   this.foo = "From bar";

//   const arrowFn = () =>
//     console.log("Arrow fn", (this && this.foo) || "Foo is not set");
//   arrowFn();

//   const nonArrowFn = function() {
//     console.log("Non arrow fn", (this && this.foo) || "Foo is not set");
//   };

//   const boundNonArrowFn = nonArrowFn.bind({ foo: "binded thing" });

//   nonArrowFn();
//   nonArrowFn.call({ foo: "SOMETHING ELSE" });
//   boundNonArrowFn();
// }

// bar.call({});
