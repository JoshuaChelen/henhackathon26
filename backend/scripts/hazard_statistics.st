"============================================================"
" Domain model: single pothole record"
"============================================================"
Object subclass: #Pothole
    instanceVariableNames: 'id imageUrl date severity latitude longitude resolvedReports'
    classVariableNames: ''
    package: 'Potholes'.

"Simple accessors used by reporting/statistics logic"
Pothole >> id            ^ id
Pothole >> severity      ^ severity
Pothole >> latitude      ^ latitude
Pothole >> longitude     ^ longitude
Pothole >> resolvedReports ^ resolvedReports
Pothole >> date          ^ date
Pothole >> imageUrl      ^ imageUrl

"Initializer: normalize numeric fields as they are loaded"
Pothole >> id: anId imageUrl: aUrl date: aDate severity: aSeverity latitude: lat longitude: lon resolvedReports: n
    id := anId.
    imageUrl := aUrl.
    date := aDate.
    severity := aSeverity.
    latitude := lat asFloat.
    longitude := lon asFloat.
    resolvedReports := n asInteger.

"Factory: build a Pothole from dictionary payloads (camelCase or snake_case keys)"
Pothole class >> fromDict: d
    "d can include either camelCase (#imageUrl, #resolvedReports) or snake_case (#image_url, #resolved_count) keys"
    | p parsedDate |
    parsedDate := (d at: #date ifAbsent: [ nil ]).
    "If date is a string like '2026-02-28', parse it; otherwise keep it."
    (parsedDate isString) ifTrue: [
        parsedDate := Date readFrom: parsedDate readStream
            ifFail: [ parsedDate ].
    ].

    p := self new.
    p id: (d at: #id)
      imageUrl: (d at: #imageUrl ifAbsent: [ d at: #image_url ifAbsent: [ '' ] ])
      date: parsedDate
      severity: (d at: #severity)
      latitude: (d at: #latitude)
      longitude: (d at: #longitude)
      resolvedReports: (d at: #resolvedReports ifAbsent: [ d at: #resolved_count ifAbsent: [ 0 ] ]).
    ^ p

"============================================================"
" Analytics container over a collection of potholes"
"============================================================"
Object subclass: #PotholeStats
    instanceVariableNames: 'potholes'
    classVariableNames: ''
    package: 'Potholes'.

"Utility: convert JSON dictionaries to symbol-key dictionaries for easier access"
PotholeStats class >> symbolizedDictionaryFrom: aDictionary
    | out |
    out := Dictionary new.
    aDictionary keysAndValuesDo: [:k :v |
        out at: (k asString asSymbol) put: v
    ].
    ^ out.

"Load JSON file, parse rows, and create typed Pothole objects"
PotholeStats class >> fromJsonFile: aPathString
    "Reads potholes JSON (array of objects) and returns a PotholeStats instance"
    | fileRef raw jsonArray potholeObjects |
    fileRef := aPathString asFileReference.
    fileRef exists ifFalse: [ self error: 'JSON file not found: ', aPathString ].

    raw := fileRef contents.
    jsonArray := NeoJSONReader fromString: raw.

    potholeObjects := jsonArray collect: [:each |
        Pothole fromDict: (self symbolizedDictionaryFrom: each)
    ].

    ^ self on: potholeObjects.

"Convenience default input path used by command-line runner"
PotholeStats class >> fromDefaultJson
    "Default path used by backend runner"
    ^ self fromJsonFile: 'data/potholes.json'.

"Convenience helper for interactive transcript output"
PotholeStats class >> printDefaultAnalysis
    "Loads potholes from default JSON path and prints a full statistical analysis"
    ^ (self fromDefaultJson) printAnalysis.

"Construct stats wrapper from any collection"
PotholeStats class >> on: aCollection
    ^ self new initializeOn: aCollection.

"Store potholes as array for stable downstream operations"
PotholeStats >> initializeOn: aCollection
    potholes := aCollection asArray.
    ^ self.

"Basic aggregate: total pothole count"
PotholeStats >> count
    ^ potholes size.

"Aggregate by severity label"
PotholeStats >> severityCounts
    "Returns Dictionary severityString -> count"
    | counts |
    counts := Dictionary new.
    potholes do: [:p |
        counts at: p severity ifAbsentPut: [0].
        counts at: p severity put: (counts at: p severity) + 1
    ].
    ^ counts.

"Aggregate: arithmetic mean of resolved reports"
PotholeStats >> averageResolvedReports
    potholes isEmpty ifTrue: [ ^ 0 ].
    ^ (potholes collect: #resolvedReports) sum asFloat / potholes size.

"Aggregate: maximum resolved reports"
PotholeStats >> maxResolvedReports
    potholes isEmpty ifTrue: [ ^ 0 ].
    ^ (potholes collect: #resolvedReports) max.

"Ranking: highest resolved report counts first"
PotholeStats >> topNByResolvedReports: n
    "Returns the top n potholes (objects) by resolvedReports descending"
    ^ (potholes asSortedCollection: [:a :b | a resolvedReports > b resolvedReports])
        first: (n min: potholes size).

"Geospatial summary: min/max latitude and longitude"
PotholeStats >> boundingBox
    "Returns a Dictionary with #minLat #maxLat #minLon #maxLon"
    potholes isEmpty ifTrue: [
        ^ Dictionary new
            at: #minLat put: nil;
            at: #maxLat put: nil;
            at: #minLon put: nil;
            at: #maxLon put: nil;
            yourself
    ].
    | lats lons |
    lats := potholes collect: #latitude.
    lons := potholes collect: #longitude.
    ^ Dictionary new
        at: #minLat put: lats min;
        at: #maxLat put: lats max;
        at: #minLon put: lons min;
        at: #maxLon put: lons max;
        yourself.

    "Mode-like metric: severity with highest frequency"
PotholeStats >> mostCommonSeverity
    | counts bestKey bestVal |
    counts := self severityCounts.
    counts isEmpty ifTrue: [ ^ nil ].
    bestKey := nil.
    bestVal := -1.
    counts keysAndValuesDo: [:k :v |
        v > bestVal ifTrue: [ bestVal := v. bestKey := k ] ].
    ^ bestKey.

"Primary structured output consumed by backend/frontend"
PotholeStats >> report
    "Single useful bundle of stats"
    | r |
    r := Dictionary new.
    r at: #count put: self count.
    r at: #severityCounts put: self severityCounts.
    r at: #mostCommonSeverity put: self mostCommonSeverity.
    r at: #averageResolvedReports put: self averageResolvedReports.
    r at: #maxResolvedReports put: self maxResolvedReports.
    r at: #boundingBox put: self boundingBox.
    r at: #top5ByResolvedReports put: ((self topNByResolvedReports: 5) collect: [:p |
        Dictionary new
            at: #id put: p id;
            at: #severity put: p severity;
            at: #resolvedReports put: p resolvedReports;
            at: #latitude put: p latitude;
            at: #longitude put: p longitude;
            yourself
    ]).
    ^ r

"Human-readable transcript report for debugging/manual runs"
PotholeStats >> printAnalysis
    "Pretty-prints analysis to Transcript and returns the report dictionary"
    | r severityCounts bbox top5 |
    r := self report.
    severityCounts := r at: #severityCounts.
    bbox := r at: #boundingBox.
    top5 := r at: #top5ByResolvedReports.

    Transcript
        cr;
        show: '=== Pothole Statistical Analysis ==='; cr;
        show: 'Total potholes: '; show: (r at: #count) printString; cr;
        show: 'Most common severity: '; show: ((r at: #mostCommonSeverity) ifNil: ['none']) printString; cr;
        show: 'Average resolved reports: '; show: ((r at: #averageResolvedReports) printString); cr;
        show: 'Max resolved reports: '; show: (r at: #maxResolvedReports) printString; cr;
        cr;
        show: '-- Severity Counts --'; cr.

    severityCounts keys asSortedCollection do: [:k |
        Transcript
            show: k printString;
            show: ': ';
            show: (severityCounts at: k) printString;
            cr
    ].

    Transcript
        cr;
        show: '-- Bounding Box --'; cr;
        show: 'Min Lat: '; show: (bbox at: #minLat) printString; cr;
        show: 'Max Lat: '; show: (bbox at: #maxLat) printString; cr;
        show: 'Min Lon: '; show: (bbox at: #minLon) printString; cr;
        show: 'Max Lon: '; show: (bbox at: #maxLon) printString; cr;
        cr;
        show: '-- Top 5 by Resolved Reports --'; cr.

    top5 doWithIndex: [:entry :idx |
        Transcript
            show: idx printString;
            show: '. id='; show: (entry at: #id) printString;
            show: ', severity='; show: (entry at: #severity) printString;
            show: ', resolved='; show: (entry at: #resolvedReports) printString;
            show: ', lat='; show: (entry at: #latitude) printString;
            show: ', lon='; show: (entry at: #longitude) printString;
            cr
    ].

    Transcript cr; show: '=== End Analysis ==='; cr.
    ^ r
