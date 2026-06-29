{{- if and (not .Values.node.dataDirPath) (not .Values.node.storagePools) }}
{{ fail "Either node.dataDirPath or node.storagePools must be set." }}
{{- end }}
