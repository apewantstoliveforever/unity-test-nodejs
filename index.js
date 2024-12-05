const express = require("express");
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const PORT = process.env.PORT || 3000;

//palindrome
const isPalindrome = (str) => {
  const cleanedStr = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleanedStr === cleanedStr.split("").reverse().join("");
};
//check two sum
const twoSum = (nums, target) => {
  const map = new Map();
  const uniquePairs = new Set();
  const result = [];
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      //pair the numbers
      const pair = [nums[map.get(complement)], nums[i]].sort((a, b) => a - b);
      const pairKey = pair.join(",");
      if (!uniquePairs.has(pairKey)) {
        //push the pair of index to result
        result.push([map.get(complement), i]);
        uniquePairs.add(pairKey);
      }
    }
    map.set(nums[i], i);
  }
  //string the result in the format of []
  return result.map((arr) => `[${arr}]`);
};

const compressJson = (input) => {
  const query = Object.keys(input)[0]; // Get the query from input keys
  const data = input[query];

  if (!data || data.length === 0) return { query, keys: [], data: [] };

  // Extract keys from the first object of the data array, excluding sport_event_status
  const keys = Object.keys(data[0]).filter(
    (key) => key !== "sport_event_status"
  );

  // Flatten `sport_event_status` once
  const sampleStatus = data[0].sport_event_status
    ? JSON.parse(data[0].sport_event_status)
    : null;

  const extraKeys = sampleStatus
    ? Object.keys(flattenObject(sampleStatus, "sport_event_status"))
    : [];
  const finalKeys = [...keys, ...extraKeys];

  // Group the values of each item into an array
  const values = data.map((item) => {
    const mainValues = keys.map((key) => item[key]);
    const extraValues = item.sport_event_status
      ? Object.values(
          flattenObject(
            JSON.parse(item.sport_event_status),
            "sport_event_status"
          )
        )
      : [];
    return [...mainValues, ...extraValues];
  });

  return {
    query,
    keys: finalKeys,
    data: values,
  };
};

const flattenObject = (obj, parentKey = "") => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    let newKey = parentKey ? `${parentKey}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const flattenedChild = flattenObject(value, newKey);
      for (const [childKey, childValue] of Object.entries(flattenedChild)) {
        result[childKey] = childValue; 
      }
    } else {
      result[newKey] = value;
    }
  }
  return result;
};


const uncompressJson = (compressedJson) => {
  const { query, keys, data } = compressedJson;

  // Helper function to unflatten keys into nested objects
  const unflattenObject = (flatObj) => {
    return Object.entries(flatObj).reduce((acc, [flatKey, value]) => {
      const keys = flatKey.split(".");
      keys.reduce((nestedObj, key, index) => {
        if (index === keys.length - 1) {
          nestedObj[key] = value;
        } else {
          if (!nestedObj[key]) nestedObj[key] = {};
        }
        return nestedObj[key];
      }, acc);
      return acc;
    }, {});
  };

  // Reconstruct the original data array
  const reconstructedData = data.map((row) => {
    const flatObj = keys.reduce((acc, key, index) => {
      acc[key] = row[index];
      return acc;
    }, {});

    const sportEventStatusKeys = keys.filter((key) =>
      key.startsWith("sport_event_status.")
    );
    const sportEventStatusObj = unflattenObject(
      Object.fromEntries(
        Object.entries(flatObj).filter(([key]) =>
          sportEventStatusKeys.includes(key)
        )
      )
    );

    // Combine flat fields and nested sport_event_status
    const reconstructedItem = { ...flatObj };
    if (sportEventStatusKeys.length) {
      reconstructedItem.sport_event_status =
        JSON.stringify(sportEventStatusObj);
      sportEventStatusKeys.forEach((key) => delete reconstructedItem[key]);
    }

    return reconstructedItem;
  });
  // Construct the uncompressed JSON structure
  const uncompressedJson = {
    [query]: reconstructedData,
  };
  return uncompressedJson;
};

//route
app.get("/", (req, res) => {
  res.send(`
            <h1>Home</h1>
            <ul>
                <li><a href="/is-palindrome">Check if the string is palindrome</a></li>
                <li><a href="/two-sum">Two Sum</a></li>
                <li><a href="/compress">Compress JSON</a></li>
                <li><a href="/uncompress">UnCompress JSON</a></li>
            </ul>

        `);
});

app.get("/is-palindrome", (req, res) => {
  res.send(`
                <h1>Palindrome</h1>
                <form action="/palindrome" method="post">
                    <input type="text" name="str" />
                    <button type="submit">Check</button>
                </form>
            `);
});
app.get("/two-sum", (req, res) => {
  res.send(`
                <h1>Two Sum</h1>
                <form action="/two-sum" method="post">
                    <input type="text" name="nums" />
                    <input type="text" name="target" />
                    <button type="submit">Check</button>
                </form>
            `);
});
app.get("/compress", (req, res) => {
  res.send(`
    <h1>Compress JSON</h1>
    <form id="uploadForm" onsubmit="handleSubmit(event)">
      <input type="file" id="fileInput" accept=".json" />
      <button type="submit">Compress</button>
    </form>
    <div id="downloadLinkContainer"></div> <!-- To display the download link -->
    <script>
      async function handleSubmit(event) {
        event.preventDefault();
        const fileInput = document.getElementById('fileInput');
        if (!fileInput.files.length) {
          alert('Please select a file!');
          return;
        }
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
          const jsonContent = reader.result;
          try {
            const response = await fetch('/compress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ json: jsonContent }),
            });
            const compressedJson = await response.text();

            // Create a Blob from the compressed JSON
            const blob = new Blob([compressedJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Create an anchor tag and simulate a click to download
            const a = document.createElement('a');
            a.href = url;
            a.download = 'compressed.json'; // Set the download filename
            a.click(); // Simulate a click to trigger download

            // Optionally, clean up the URL object after download
            URL.revokeObjectURL(url);

          } catch (error) {
            alert('Error compressing JSON.');
            console.error(error);
          }
        };
        reader.readAsText(file);
      }
    </script>
  `);
});
app.get("/uncompress", (req, res) => {
  res.send(`
    <h1>UnCompress JSON</h1>
    <form id="uploadForm" onsubmit="handleSubmit(event)">
      <input type="file" id="fileInput" accept=".json" />
      <button type="submit">Compress</button>
    </form>
    <div id="downloadLinkContainer"></div> <!-- To display the download link -->
    <script>
      async function handleSubmit(event) {
        event.preventDefault();
        const fileInput = document.getElementById('fileInput');
        if (!fileInput.files.length) {
          alert('Please select a file!');
          return;
        }
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
          const jsonContent = reader.result;
          try {
            const response = await fetch('/uncompress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ json: jsonContent }),
            });
            const uncompressedJson = await response.text();

            const blob = new Blob([uncompressedJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'uncompressed.json'; // Set the download filename
            a.click(); // Simulate a click to trigger download

            URL.revokeObjectURL(url);

          } catch (error) {
            alert('Error compressing JSON.');
            console.error(error);
          }
        };
        reader.readAsText(file);
      }
    </script>
  `);
});

// api
app.post("/palindrome", (req, res) => {
  const str = req.body.str;
  const result = isPalindrome(str);
  res.send(`
      <h1>Result</h1>
      <p>String: <b>${str}</b></p>
      <p>Is Palindrome: <b>${result ? "Yes" : "No"}</b></p>
      <a href="/">Check another string</a>
    `);
});
app.post("/two-sum", (req, res) => {
  //nums is array of numbers
  const nums = req.body.nums.split(",").map((num) => parseInt(num));
  const target = parseInt(req.body.target);
  const result = twoSum(nums, target);
  res.send(`
      <h1>Result</h1>
      <p>Array: <b>${nums}</b></p>
      <p>Target: <b>${target}</b></p>
      <p>Result: <b>${result}</b></p>
      <a href="/two-sum">Check another array</a>
    `);
});
// API for Compressing JSON
// Route to render the form

// API for compressing JSON
app.post("/compress", (req, res) => {
  try {
    const json = JSON.parse(req.body.json);
    const result = compressJson(json);

    // Generate a compressed JSON string
    const compressedJson = JSON.stringify(result);

    // Return the compressed JSON string
    res.send(compressedJson);
  } catch (error) {
    res.status(400).send("Invalid JSON or error occurred during compression.");
  }
});

app.post("/uncompress", (req, res) => {
  try {
    const json = JSON.parse(req.body.json);
    const result = uncompressJson(json);

    const unCompressedJson = JSON.stringify(result);

    res.send(unCompressedJson);
  } catch (error) {
    res.status(400).send("Invalid JSON or error occurred during compression.");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
