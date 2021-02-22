FROM registry.access.redhat.com/ubi8/nodejs-14:latest
COPY *.js /opt/app-root/src
COPY package.json /opt/app-root/src
COPY start.sh /opt/app-root/src
RUN npm i
CMD sh start.sh
