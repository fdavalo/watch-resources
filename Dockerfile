FROM registry.access.redhat.com/ubi8/nodejs-14:latest
RUN mkdir -p /opt/app
COPY src /opt/app
WORKDIR /opt/app 
RUN npm i
CMD sh start.sh
