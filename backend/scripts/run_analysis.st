"Usage (Pharo):
  pharo --headless /path/to/Your.image st scripts/run_analysis.st <inputPath> <outputPath>

Input defaults to data/potholes.json when omitted.
Output defaults to data/pothole_analysis.json when omitted.
"

"Main script entry: execute analysis workflow with top-level error handling"
[ | args inputPath outputPath statsClass writerClass stats analysis analysisJson hazardFile outputRef stream |
  [
    "Load analytics classes/methods from the companion script"
    hazardFile := (FileLocator workingDirectory / 'scripts' / 'hazard_statistics.st') fullName.
    SmalltalkImage current fileIn: hazardFile.

    "Read command-line arguments and fall back to default data paths"
    args := Smalltalk arguments.
    inputPath := (args size >= 2)
      ifTrue: [ args at: (args size - 1) ]
      ifFalse: [ 'data/potholes.json' ].
    outputPath := (args size >= 2)
      ifTrue: [ args last ]
      ifFalse: [ 'data/pothole_analysis.json' ].

    "Resolve required classes dynamically so missing dependencies fail clearly"
    statsClass := Smalltalk at: #PotholeStats ifAbsent: [
      self error: 'PotholeStats class not found after loading hazard_statistics.st'
    ].
    writerClass := Smalltalk at: #NeoJSONWriter ifAbsent: [
      self error: 'NeoJSONWriter class not found in image'
    ].

    "Compute statistical report and serialize to JSON"
    stats := statsClass fromJsonFile: inputPath.
    analysis := stats report.
    analysisJson := writerClass toString: analysis.

    "Ensure output directory exists, then write the analysis file"
    outputRef := outputPath asFileReference.
    outputRef parent ensureCreateDirectory.
    outputRef ensureDelete.
    stream := outputRef writeStream.
    stream nextPutAll: analysisJson.
    stream close.

    "Emit success logs (including a machine-readable JSON marker for backend fallback parsing)"
    Transcript
      show: 'Smalltalk analysis written to '; show: outputPath; cr.
    Transcript
      show: 'ANALYSIS_JSON:'; show: analysisJson; cr.
  ]
    "Log and rethrow so callers can treat failure as non-success"
    on: Error
    do: [ :error |
      Transcript show: 'Smalltalk analysis failed: '; show: error messageText; cr.
      error pass
    ].
].

"Exit headless image without snapshot after script completion"
Smalltalk snapshot: false andQuit: true.
