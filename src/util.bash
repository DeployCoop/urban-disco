#!/usr/bin/env bash

fetch_wrapper () {
  WRAPPED_REPO_NAME=$1
  WRAPPED_REPO_URL=$2
  cd ${FETCHR_CACHE}
  if [[ ! -d ${FETCHR_CACHE}/${WRAPPED_REPO_NAME} ]]; then 
    git clone --filter=blob:none ${WRAPPED_REPO_URL}
  else
    cd ${FETCHR_CACHE}/${WRAPPED_REPO_NAME}
    git pull
  fi
}

test_env () {
  if [[ -f .env ]]; then
  . .env
  else
    make_env
    exit 1
  fi
}

make_env () {
  THIS_CWD=$(pwd -P)
  echo "No .env file, creating a new .env at ${THIS_CWD}, please inspect it"
  echo "URBAN_DISCO_BASE_PATH=${THIS_CWD}" >> .env
}
