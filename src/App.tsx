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
  station: BartStation | undefined;
  dir: "s" | "n" | undefined;
};
function hashToLocation(h: string): LocationInfo {
  const [station, dir] = h.substr(1).split("/");
  return { station: station as BartStation, dir: dir as any };
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

  const formattedTimeEstimates = etds.map((etd: ETD, i: number) => {
    const time = getMinutesFromETD(etd);
    const formattedString = `${time} minutes`;
    const bartBarWidth = `calc(100% - ${5 * time}px)`;
    return (
      <div className="bart-row" key={i}>
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
      </div>
    );
  });

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
        console.log("I have the response!");
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
