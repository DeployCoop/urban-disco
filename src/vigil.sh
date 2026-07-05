#!/usr/bin/env bash
: "${VERBOSITY:=0}"
: "${FETCHR_CACHE:=/tmp}"
. src/util.bash
test_env
set -eux

fetch_wrapper 'vigil' 'https://github.com/Vigil-SOC/vigil.git'
cd ${FETCHR_CACHE}/vigil/helm
rm -Rf ${URBAN_DISCO_BASE_PATH}/charts/vigil
mkdir -p ${URBAN_DISCO_BASE_PATH}/charts/
cp -av vigil ${URBAN_DISCO_BASE_PATH}/charts/
cd ${URBAN_DISCO_BASE_PATH}/charts/vigil
pwd 
rm -v .gitignore
helm dep build
cd charts
for i in $(ls *.tgz); do tar zxvfp $i;done
rm *.tgz
