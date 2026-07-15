param(
    [Parameter(Mandatory = $true)]
    [string]$InputDirectory,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Escape-MarkdownCell([string]$Value) {
    if ($null -eq $Value) { return '' }
    return (($Value -replace '\|', '\|') -replace "`r?`n", '<br>')
}

function Get-NodeText($Node, $NamespaceManager) {
    $parts = @()
    foreach ($textNode in $Node.SelectNodes('.//w:t', $NamespaceManager)) {
        $parts += $textNode.InnerText
    }
    return ($parts -join '')
}

function Convert-DocxFile([System.IO.FileInfo]$File, [string]$DestinationRoot) {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($File.FullName)
    try {
        $documentEntry = $zip.GetEntry('word/document.xml')
        if ($null -eq $documentEntry) { throw "No se encontro word/document.xml en $($File.Name)" }

        $reader = [System.IO.StreamReader]::new($documentEntry.Open())
        try { [xml]$documentXml = $reader.ReadToEnd() } finally { $reader.Dispose() }

        $relationships = @{}
        $relsEntry = $zip.GetEntry('word/_rels/document.xml.rels')
        if ($null -ne $relsEntry) {
            $relsReader = [System.IO.StreamReader]::new($relsEntry.Open())
            try { [xml]$relsXml = $relsReader.ReadToEnd() } finally { $relsReader.Dispose() }
            foreach ($relationship in $relsXml.Relationships.Relationship) {
                $relationships[$relationship.Id] = $relationship.Target
            }
        }

        $namespaceManager = [System.Xml.XmlNamespaceManager]::new($documentXml.NameTable)
        $namespaceManager.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
        $namespaceManager.AddNamespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')
        $namespaceManager.AddNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')

        $safeName = [System.IO.Path]::GetFileNameWithoutExtension($File.Name)
        $mediaDirectoryName = "$safeName-media"
        $mediaDirectory = Join-Path $DestinationRoot $mediaDirectoryName
        $markdown = [System.Collections.Generic.List[string]]::new()
        $markdown.Add("# $safeName")
        $markdown.Add('')

        $body = $documentXml.SelectSingleNode('//w:body', $namespaceManager)
        foreach ($node in $body.ChildNodes) {
            if ($node.LocalName -eq 'p') {
                $text = Get-NodeText $node $namespaceManager
                $styleNode = $node.SelectSingleNode('./w:pPr/w:pStyle', $namespaceManager)
                $style = if ($null -ne $styleNode) { $styleNode.GetAttribute('val', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main') } else { '' }
                if (-not [string]::IsNullOrWhiteSpace($text)) {
                    if ($style -match 'Heading1|T.tulo1|Titulo1') { $markdown.Add("## $text") }
                    elseif ($style -match 'Heading2|T.tulo2|Titulo2') { $markdown.Add("### $text") }
                    elseif ($style -match 'Heading3|T.tulo3|Titulo3') { $markdown.Add("#### $text") }
                    else { $markdown.Add($text) }
                    $markdown.Add('')
                }

                foreach ($blip in $node.SelectNodes('.//a:blip', $namespaceManager)) {
                    $relationshipId = $blip.GetAttribute('embed', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
                    if (-not $relationships.ContainsKey($relationshipId)) { continue }
                    $target = $relationships[$relationshipId] -replace '\\', '/'
                    $entryPath = if ($target.StartsWith('/')) { $target.TrimStart('/') } else { "word/$target" }
                    $entryPath = $entryPath -replace 'word/\.\./', ''
                    $mediaEntry = $zip.GetEntry($entryPath)
                    if ($null -eq $mediaEntry) { continue }
                    [System.IO.Directory]::CreateDirectory($mediaDirectory) | Out-Null
                    $destination = Join-Path $mediaDirectory $mediaEntry.Name
                    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($mediaEntry, $destination, $true)
                    $relativeMedia = "$mediaDirectoryName/$($mediaEntry.Name)" -replace '\\', '/'
                    $markdown.Add("![$safeName]($relativeMedia)")
                    $markdown.Add('')
                }
            }
            elseif ($node.LocalName -eq 'tbl') {
                $rows = @($node.SelectNodes('./w:tr', $namespaceManager))
                if ($rows.Count -eq 0) { continue }
                $tableRows = @()
                $maxColumns = 0
                foreach ($row in $rows) {
                    $cells = @()
                    foreach ($cell in $row.SelectNodes('./w:tc', $namespaceManager)) {
                        $cells += (Escape-MarkdownCell (Get-NodeText $cell $namespaceManager))
                    }
                    $maxColumns = [Math]::Max($maxColumns, $cells.Count)
                    $tableRows += ,$cells
                }
                if ($maxColumns -eq 0) { continue }
                foreach ($rowIndex in 0..($tableRows.Count - 1)) {
                    $cells = @($tableRows[$rowIndex])
                    while ($cells.Count -lt $maxColumns) { $cells += '' }
                    $markdown.Add('| ' + ($cells -join ' | ') + ' |')
                    if ($rowIndex -eq 0) { $markdown.Add('| ' + ((1..$maxColumns | ForEach-Object { '---' }) -join ' | ') + ' |') }
                }
                $markdown.Add('')
            }
        }

        [System.IO.Directory]::CreateDirectory($DestinationRoot) | Out-Null
        $outputPath = Join-Path $DestinationRoot "$safeName.md"
        [System.IO.File]::WriteAllLines($outputPath, $markdown, [System.Text.UTF8Encoding]::new($false))
        return $outputPath
    }
    finally {
        $zip.Dispose()
    }
}

$inputRoot = (Resolve-Path -LiteralPath $InputDirectory).Path
[System.IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null
$outputRoot = (Resolve-Path -LiteralPath $OutputDirectory).Path

Get-ChildItem -LiteralPath $inputRoot -Filter '*.docx' -File | ForEach-Object {
    Convert-DocxFile $_ $outputRoot
}
