import React from "react";
import logo from "./logo.svg";
import "./App.css";

const App: React.FC = () => {
  // hi!!!
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
      </header>
    </div>
  );
};

// http://api.bart.gov/api/etd.aspx?cmd=etd&dir=n&orig=WOAK&key=MW9S-E7SL-26DU-VV8V&json=y

console.log("hello from the console!!!");

const myAdder = (a: number, b: number) => a + b;
console.log("My adder", myAdder(1, 2));

// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
let bartPromise: Promise<Response> = fetch(
  "https://api.bart.gov/api/etd.aspx?cmd=etd&dir=s&orig=WOAK&key=MW9S-E7SL-26DU-VV8V&json=y"
);
console.log(bartPromise);

type ETD = {
  length: string;
  minutes: string;
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

bartPromise
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
    const allEstimatesForEveryTrain: Array<number> = etdsForStation
      .map(train => train.estimate.map(etd => etd.minutes))
      .flat()
      .map(strMinutes => (strMinutes === "Leaving" ? 0 : parseInt(strMinutes)))
      .sort((a, b) => a - b);

    console.log("All estimates: ", allEstimatesForEveryTrain);
  });

// Overview
// 1. Get the data ✅
// 2. parse the data/format the data ✅
// ---
// 3. Show it off!
// 4. Allow out url pararmeters

// https://bart.marcopolo.io/

// http://qwantz.com/

export default App;
