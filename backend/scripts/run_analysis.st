"Usage (Pharo):
  pharo --headless /path/to/Your.image st scripts/run_analysis.st <inputPath> <outputPath>

Input defaults to data/potholes.json when omitted.
Output defaults to data/pothole_analysis.json when omitted.
"

| args inputPath outputPath stats analysis analysisJson hazardFile outputRef outStream |

hazardFile := (FileLocator workingDirectory / 'scripts' / 'hazard_statistics.st') fullName.
SmalltalkImage current fileIn: hazardFile.

args := Smalltalk arguments.
inputPath := (args size >= 1)
  ifTrue: [ args first ]
  ifFalse: [ 'data/potholes.json' ].
outputPath := (args size >= 2)
  ifTrue: [ args at: 2 ]
  ifFalse: [ 'data/pothole_analysis.json' ].

stats := PotholeStats fromJsonFile: inputPath.
analysis := stats report.
analysisJson := NeoJSONWriter toString: analysis.

outputRef := outputPath asFileReference.
outputRef ensureDelete.
outStream := outputRef writeStream.
outStream nextPutAll: analysisJson.
outStream close.

Transcript
  show: 'Smalltalk analysis written to '; show: outputPath; cr.

Smalltalk snapshot: false andQuit: true.
