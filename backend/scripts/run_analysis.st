"Usage (Pharo):
  pharo --headless /path/to/Your.image st scripts/run_analysis.st <inputPath> <outputPath>

Input defaults to data/potholes.json when omitted.
Output defaults to data/pothole_analysis.json when omitted.
"

[ | args inputPath outputPath statsClass writerClass stats analysis analysisJson hazardFile outputRef stream |
  [
    hazardFile := (FileLocator workingDirectory / 'scripts' / 'hazard_statistics.st') fullName.
    SmalltalkImage current fileIn: hazardFile.

    args := Smalltalk arguments.
    inputPath := (args size >= 2)
      ifTrue: [ args at: (args size - 1) ]
      ifFalse: [ 'data/potholes.json' ].
    outputPath := (args size >= 2)
      ifTrue: [ args last ]
      ifFalse: [ 'data/pothole_analysis.json' ].

    statsClass := Smalltalk at: #PotholeStats ifAbsent: [
      self error: 'PotholeStats class not found after loading hazard_statistics.st'
    ].
    writerClass := Smalltalk at: #NeoJSONWriter ifAbsent: [
      self error: 'NeoJSONWriter class not found in image'
    ].

    stats := statsClass fromJsonFile: inputPath.
    analysis := stats report.
    analysisJson := writerClass toString: analysis.

    outputRef := outputPath asFileReference.
    outputRef parent ensureCreateDirectory.
    outputRef ensureDelete.
    stream := outputRef writeStream.
    stream nextPutAll: analysisJson.
    stream close.

    Transcript
      show: 'Smalltalk analysis written to '; show: outputPath; cr.
    Transcript
      show: 'ANALYSIS_JSON:'; show: analysisJson; cr.
  ]
    on: Error
    do: [ :error |
      Transcript show: 'Smalltalk analysis failed: '; show: error messageText; cr.
      error pass
    ].
].

Smalltalk snapshot: false andQuit: true.
