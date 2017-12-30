#!/bin/bash

pdflatex thesis && pdflatex thesis-frn && pdflatex thesis && biber thesis
