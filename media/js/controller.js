var Controller;
Controller = {
    ingest:function(data){
        var result;

        if (this.options.competition == data.competition)
        {
            if (this.__loading)  this.__lastMessage = data;
            else  {
                result = Model.put(data);
                if (result && result.length) {
                    console.error("\n++++++++ MESSAGE ++++++++\n" + JSON.stringify(data, undefined, 1) + "\n++++++++ END MESSAGE ++++++++\n");
                }
            }
        }
    },
    modelInserted:function(path){
        //console.log('Controller.modelInserted: ' + path);
        View.inserted(path);
        if (this.__highestRound != -1) View.reordered(this.options.containers.rounds + '.' + this.__highestRound);
        if (this.options.containers.navigation && this.options.containers.navigation.length) View.inserted(this.options.containers.navigation);
        if (! this.__swipeView)
        {
            if (Controller.options.containers.swipe) Controller.__swipeView = new Swipe(document.getElementById(Controller.options.containers.swipe), Controller.options.swipeOptions);
        }
        else this.__swipeView.setup();
        if (this.__swipeView) this.__swipeTime();
        else if (Controller.options.containers.remove)
        {
            $('#' + Controller.options.containers.remove).remove();
            Controller.options.containers.remove = null;
        }
    },
    modelReordered:function(){
        // TODO: remove
    },
    modelUpdated:function(path){
        //console.log('modelUpdated: ' + path);
        View.updated(path);
    },
    request:function(id, path, key){
        if (! (path && path.length)) path = 'rounds';
        if (! (key && key.length)) key = 'data';
        var url = Controller.options.endpoint + id + '/' + path;
        //console.log(url + ' ' + key);
        Controller.__requestKey = key;
        $.ajax({url: url, dataType: 'json', success: function(data, status, request){
            Model.put(data, Controller.__requestKey);
            Controller.__loading = false;
            if (Controller.__lastMessage) {
                Model.put(Controller.__lastMessage);
                Controller.__lastMessage = null;
           }
        }});
    },
    setOptions:function(options){
        $.extend(true,this.options, options);
        if (! this.__initialized) this.__initialize();
        return this;
    },
	viewCount: function(template_path){
		var count,bits,object;
		count = 0;
		bits = template_path.split('.');
		switch(bits[bits.length-1]){
			case this.options.containers.navigation: {
				count = Model.rounds.length;
				break;
			}
			default: {
				object = Model.find(bits);
				count = object.length;
			}
		}
        //console.log('Controller.viewCount: ' + count);
		return count;
	},
    viewInserted: function(template_path, property_tag) {
        var ok,property,bits,s,index;
        bits = template_path.split('.');
        property = bits.pop();
        //console.log('Controller.viewInserted: ' + property + ' ' + template_path);

        ok = false;
        index = false;
        switch (property) {
           case this.options.containers.score:{
                if (! this.options.scoreOptions.width)
                {
                    s = property_tag.width();
                    s = Number(s);
                    this.options.scoreOptions.width = s;
                }
                break;
            }
            case this.options.containers.competitorBtnYay:
            case this.options.containers.competitorBtnNay: {
                ok = true;
                break;
            }
            case this.options.containers.judgeMeterYay:property_tag.data('yay', true);
            case this.options.containers.judgeMeterNay: {
                index = true;
                ok = true;
                break;
            }

            case this.options.containers.competitorMeterYay: property_tag.data('yay', true);
            case this.options.containers.competitorMeterNay:
            {
                index = true;
                break;
            }
            case this.options.containers.navigation:{
                if (! this.options.navigationOptions.pageOff) this.options.navigationOptions.pageOff = property_tag.attr('class');
                ok = true;
                break;
            }
            case this.options.containers.completed:
            case this.options.containers.link:
            case this.options.containers.judgeBtnNay:
            case this.options.containers.judgeBtnYay:
                ok = true; // for all that fell through to here
        }
        if (index){
            property_tag.data('index', template_path.replace(/\./g, ''));
        }
        if (ok || (property_tag.length && (property_tag[0].tagName == 'A'))){
            //console.log('Controller.viewInserted: installing ' + template_path);
            property_tag.click({path: template_path}, this.__click);
        }
     },
	viewUpdated: function(template_path, property_tag) {
        //console.log('Controller.viewUpdated: ' + template_path);// + ' ' + property_tag);
        var options,score_options,model_options, containers, index,property,bits,cheered,rating,object,tag_name,data,percentage,disabled;
        options = this.options;
        score_options = options.scoreOptions;
        model_options = Model.options;
        containers = options.containers;
        bits = template_path.split('.');
        property = bits.pop();
        index = Number(bits.pop());
        object = Model.find(template_path);
        if (property == containers.navigation){
            property_tag.attr('class', options.navigationOptions['page' + ((this.__displayedRound == index) ? 'On' : 'Off')]);
        }
        else if (object) {
            disabled = (object.round != Model.round);
            switch (property)
            {
                case containers.completed:{
                    property_tag.attr('class', (this.__roundDataCompleted(object.round.id) ? options.popupOptions.active : options.popupOptions.inactive ));
                    break;
                }
               case 'index': { // used on leaderboard
                    property_tag.val(1 + index);
                    break;
                }
                case containers.score:{ // used on leaderboard
                    rating = object.getModelData(score_options.key);
                    rating = rating / score_options.max;
                    rating = rating * score_options.width;
                    property_tag.width(rating + 'px');
                    break;
                }
                case containers.roundHide: { // previous round badge
                	property_tag.toggle(disabled);
                	break;
                }
                case containers.competitorMeterYay:
                case containers.competitorMeterNay: object = object.competitor;
                case containers.judgeMeterYay:
                case containers.judgeMeterNay:{
                    percentage = object.getPercentage();
                    if (disabled) {
						this.__animationTagDraw(property_tag, true, percentage);
					}
					else {
						if ((percentage != property_tag.data('percentage'))) {
							property_tag.data('target', percentage);
							this.__animationStart(property_tag);
                    	}						
					}
                    break;
                }
                case containers.competitorBtnYay:
                case containers.competitorBtnNay:{
                    cheered = (property == containers.competitorBtnYay);
                    tag_name = (cheered ? model_options.competitorKeyYay : model_options.competitorKeyNay);
                    rating = this.__roundDataGet(object.competitor.id + '.' + tag_name, object.round.id);
                    property_tag.val(rating);
                    // intentional fall through to similar buttons
                }

                case containers.link:{
                    if (rating == undefined) {
                        rating = object.getModelData(containers.link);
                        disabled = ! (rating && rating.length);
                    }
                    // intentional fall through to judgeBtns
                }
                case containers.judgeBtnNay:
                case containers.judgeBtnYay:{
					if (disabled == Boolean(property_tag.data('enabled'))) {
                        property_tag.data('enabled', ! disabled);
                        if (disabled) property_tag.attr('disabled', 'disabled');
                        else property_tag.removeAttr('disabled');
                    }
                    break;
                }

                case model_options.competitorKeyYay:
                case model_options.competitorKeyNay:{
                    data = object.getModelData(property);
                    if (data != undefined)
                    {
                        data = Number(data);
                        if (data > 9999){
                            if (data > 9999999)data = this.__addCommas((data / 1000000).toFixed(3)) + 'M';
                            else data = this.__addCommas(data);
                        }
                        property_tag.val(data);
                    }
                    break;
                }
                case containers.competitorName:
                case containers.judgeName: {
                    property = 'name';
                } // intentional fall through to default
                default: {
                    if (property_tag.length){
                        tag_name = property_tag[0].tagName;

                        switch (tag_name)
                        {
                            case 'INPUT':
                            {
                                data = object.getModelData(property);
                                if (data != undefined) property_tag.val(data);
                                break;
                            }
                            case 'IMG':
                            {
                            	data = property_tag.width();
                            	percentage = property_tag.height();
									if (window.devicePixelRatio >= 2)
									{
										data *= 2;
										percentage *= 2;
									}
									data = data + 'x' + percentage;
									
									property_tag.attr('src', options.endpoint + object.getModelData('id') + '/picture/' + data);
								
								break;
                            }
                        }

                    }
                    else console.error('Controller.viewUpdated: UNFOUND ' + template_path);
                }
            }
        }
	},
    __addCommas: function(nStr){
        nStr += '';
        x = nStr.split('.');
        x1 = x[0];
        x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + ',' + '$2');
        }
        return x1 + x2;
    },
    __animationStop:function(tag){
          if (tag.data('animating'))
          {
              var pos = this.__animations.indexOf(tag);
              if (pos > -1)
              {
                  this.__animations.splice(pos, 1);
                  if (! this.__animations.length) clearInterval(this.__animating)
              }
              tag.data('animating', false);
          }
    },
    __animationStart:function(tag){
        if (! tag.data('animating'))
        {
            tag.data('animating', true);
            if (! this.__animations.length) this.__animating = setInterval(this.__animate, 50); // 20 fps
            this.__animations.push(tag);
        }
    },
    __animate: function(){
        var i,z,tag;
        z = Controller.__animations.length;
        for (i = z - 1; i > -1; i--)
        {
            tag = Controller.__animations[i];
            Controller.__animationTagDraw(tag, false, tag.data('target'));
        }
    },
	__animationTagDraw: function(tag, disabled, target){
		
        var x,w,h,ctx,mask,d,index,offset,yay,s,n,percentage;
        yay = tag.data('yay');
            
        percentage = (disabled ? target : tag.data('percentage'));
        if (percentage == undefined) percentage = 50;

        if (percentage < target) percentage = Math.min(percentage + 1, target);
        else if (percentage > target) percentage = Math.max(percentage - 1, target);

        tag.data('percentage', percentage);
        if (target == percentage) Controller.__animationStop(tag);

        if (yay) {

            s = tag.css('width');
            w = Number(s.substr(0, s.length - 2));
            s = tag.css('border-left-width');
            n = Number(s.substr(0, s.length - 2));
            w += n;
            s = tag.css('border-right-width');
            n = Number(s.substr(0, s.length - 2));
            w += n;
            s = tag.css('padding-left');
            n = Number(s.substr(0, s.length - 2));
            w += n;
            s = tag.css('padding-right');
            n = Number(s.substr(0, s.length - 2));
            w += n;

            offset = w / 10;
            offset = Math.min(offset, Math.max(-offset, percentage - target));


            s = tag.css('height');
            h = Number(s.substr(0, s.length - 2));

            s = tag.css('border-top-width');

            n = Number(s.substr(0, s.length - 2));
            h += n;
            s = tag.css('border-bottom-width');
            n = Number(s.substr(0, s.length - 2));
            h += n;
            s = tag.css('padding-top');
            n = Number(s.substr(0, s.length - 2));
            h += n;
            s = tag.css('padding-bottom');
            n = Number(s.substr(0, s.length - 2));
            h += n;

            x = 0;
            d = Math.round((percentage * w) / 100);

            if (! yay)
            {
                x = w;
                d = -d;
            }
            mask = tag.data("index");

            ctx = document.getCSSCanvasContext("2d", mask, w, h);

            ctx.clearRect(0, 0, w, h);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + d, 0);
            if (Math.abs(offset) > 1) ctx.lineTo(x + d - offset, h / 2);
            ctx.lineTo(x + d, h);
            ctx.lineTo(x, h);
            ctx.closePath();
            ctx.setFillColor('black');
            ctx.fill();
            tag.attr('style', '-webkit-mask-image:-webkit-canvas(' + mask + ');');
        }
        else percentage = 100 - percentage;
        if (percentage < 50) percentage = '';
        else if ((percentage == 50) && (! yay)) percentage = '';
        else percentage += '%';
		tag.val(percentage);
	},
    __click: function(event){
		var bits,object,property_index,property_index_number,yay_nay,path,key,value, controller_options, model_options, containers, insight_options;
        controller_options = Controller.options;
        model_options = Model.options;
        containers = controller_options.containers;
        insight_options = controller_options.insightsOptions;
        path = event.data.path;
		bits = path.split('.');

        property_index = bits.pop();
        path = bits.join('.');
        object = Model.find(path);
        property_index_number = Number(bits.pop());
        switch(property_index) {
            case containers.competitorBtnNay:
            case containers.competitorBtnYay: {
                if (object && object.competitor) {
                    object = object.competitor;

                    yay_nay = (property_index == containers.competitorBtnYay);
                    key = (yay_nay ? model_options.competitorKeyYay : model_options.competitorKeyNay);

                    // update totalCheers or totalBoos, quietly
                    object.incrementModelData(key);

                    // update the user's vote total
                    value = Controller.__roundDataGet(object.id + '.' + key);
                    value ++;
                    Controller.__roundDataSet(object.id + '.' + key, value);

                    // update the user's clicked state for this object/round
                    if (! Controller.__roundDataGet(object.id)){
                        Controller.__roundDataSet(object.id, 1);
                        if (Controller.__roundDataCompleted()) {
                            View.updated(path + '.' + containers.completed);
                        }
                    }

                    // update this user count
                    View.updated(path + '.' + (yay_nay ? containers.competitorBtnYay : containers.competitorBtnNay));

                    // update both cheerometer backgrounds
                    View.updated(path + '.' + containers.competitorMeterYay);
                    View.updated(path + '.' + containers.competitorMeterNay);


                    // report click to API
                    Controller.__vote(object.round, yay_nay);
                    // report click to insights
                    key = (yay_nay ? insight_options.tapCheer : insight_options.tapBoo);
                    Controller.__insights(key, encodeURI(object.getModelData('name')));
                }
                break;
            }
            case containers.judgeBtnNay:
            case containers.judgeBtnYay: {
                yay_nay = (property_index == containers.judgeBtnYay);
                key = (yay_nay ? model_options.judgeKeyYay : model_options.judgeKeyNay);

                object.incrementModelData(key);

                // update the user's clicked state for this object/round
                if (! Controller.__roundDataGet(object.id)){
                    Controller.__roundDataSet(object.id, 1);
                    if (Controller.__roundDataCompleted()){
                        bits.pop();
                        View.updated(bits.join('.') + '.' + containers.completed);
                    }
                }



                // update the thermometer
                View.updated(path + '.' + containers.judgeMeterYay);
                View.updated(path + '.' + containers.judgeMeterNay);

                // make call to API
                Controller.__vote(object, yay_nay);

                // make call to insights
                key = (yay_nay ? insight_options.tapAgree : insight_options.tapDisagree);
                Controller.__insights(key, encodeURIComponent(object.round.competitor.getModelData('name')), '', encodeURIComponent(object.getModelData('name')));

                break;
            }
            case containers.completed:{

                Controller.__popOver.toggle(true);
                break;
            }
            case containers.link: {
                Controller.__insights(insight_options.tapItunes, object.getModelData('id'), encodeURI(object.getModelData('what')));
                window.location.href = object.getModelData(property_index);
                break;
            }
            case containers.navigation: {
                Controller.__navigating = true;
                Controller.__insights(insight_options.navigateTap, Model.rounds[Controller.__displayedRound].getModelData('id'), Model.rounds[property_index_number].getModelData('id'));
                Controller.__swipeView.slide(property_index_number);

                break;
            }
            default: console.error('Controller.__click: UNKNOWN ' + property_index)
        }
	},
    __clickPopover:function(event){
        Controller.__popOver.toggle(false);
    },
	__initialize:function(){
		Model.setOptions(this.options.modelOptions, this);
        View.setOptions(this.options.viewOptions, this);
        __initialized = true;
        Controller.__insights(Controller.options.insightsOptions.loadedApp, 'web-app', '1.0.1');
        Controller.__popOver = $('#' + Controller.options.containers.cardCompleted);
        Controller.__popOver.click(Controller.__clickPopover);
        Controller.__clickPopover();
   },
    __insights:function(event, participant, extra1, extra2, extra3){

        if (! participant) participant = '';
        if (! extra1) extra1 = '';
        if (! extra2) extra2 = '';
        if (! extra3) extra3 = '';
        var now = new Date();
        var now_utc = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),  now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());

        var url = this.options.insightsOptions.endpoint;
        var data = [];


        data.push(this.options.insightsOptions.userIdentifier); //userid
        data.push(this.options.insightsOptions.sessionIdentifier); //sessionid
        data.push(''); //roomid
        data.push(this.options.insightsOptions.context); // contextid
        data.push('')//;screenid
        data.push('');//widgetid
        data.push(event); //eventid
        data.push(now_utc.getTime());

        data.push(participant); //participant id
        data.push(extra1);// song id
        data.push(extra2);
        data.push(extra3);
        data.push('');
        data.push('');
        data.push('');
        data.push('');
        //userid||sessionid||roomid||3003(contextid)||screenid||widgetid||6020(eventid)||1326456827564 (Timestamp in milliseconds )||peelid||(empty string)||udid||(empty string)||device type||(empty string)||webapp version||(empty string)

       // (empty string)||(empty string)||(empty string)||(contextid)||(empty string)||(empty string)||6001(eventid)||(empty string)||peelid||(empty string)||udid||(empty string)||participantid||(empty string)||songid||(empty string)

        data = data.join('||');
        //console.log(data);
        $.ajax({
            type: 'POST',
            url: url,
            data: {event: data},
            dataType: 'json'
        });

    },
    __navigationSwitch:function(index){
       // console.log('Controller.__navigationSwitch: ' + index)
        var nav = Controller.options.containers.navigation;
        var cur_round = Controller.__displayedRound;
        Controller.__displayedRound = index;
        View.updated(nav + '.' + cur_round + '.' + nav);
        View.updated(nav + '.' + Controller.__displayedRound + '.' + nav);
    },
    __roundData:function(id){
        var round = localStorage.getItem(id);
        if (round && round.length)
        {
            round = JSON.parse(round);
        }
        return round;
    },
    __roundDataCompleted:function(id){
        var completed,z,i;
        completed = false;
        if (! id) id = Model.round.id;
        var round = Model.roundFromId(id);
        if (round)
        {
            if (this.__roundDataGet(round.competitor.id, id)){
                completed = true;
                z = round.judges.length;
                for (i = 0; i < z; i++){
                   if (! this.__roundDataGet(round.judges[i].id, id)){
                       completed = false;
                       break;
                   }
                }
            }
         }
        return completed;
    },
    __roundDataGet:function(key, id){
        if (! id) id = Model.round.id;
       var value, round;
       value = 0; // they are all numeric values
        round = Controller.__roundData(id);
        if (round && round[key]) value = round[key];
        return value;
    },
    __roundDataSet:function(key, value){ // no id because only current round is ever set
        var round, id;
        id = Model.round.id;
        round = Controller.__roundData(id);
        if (! round) round = {};
        round[key] = value;

        localStorage.setItem(id, JSON.stringify(round, undefined, 1));


    },
    __swipeTime:function(){
        if (! this.__swipeInterval) this.__swipeInterval = setInterval(this.__swipeTimed, 100);
    },
    __swipeTimed:function(){
        if (Controller.__highestRound != (Model.rounds.length - 1)) Controller.__highestRound = Model.rounds.length - 1;
        else
        {
            clearInterval(Controller.__swipeInterval);
            Controller.__swipeInterval = false;

            var index = Controller.__highestRound;
            if (Controller.__swipeView)
            {
                if (Controller.options.containers.remove) index++;
                Controller.__clickPopover();
                Controller.__swipeView.slide(index);
            }
        }
    },
    __vote: function(object, cheer){
        var url = this.options.endpoint;
        url += object.round.id + '/';
        url += object.getModelData('id') + '/';
        url += (cheer ? 'cheer' : 'boo');
        $.ajax(url, {type:'POST'});
    },
	options: {
        competition:'',
        endpoint: '',
        containers: {},
        viewOptions:{
            data: {
            }
        },
        insightsOptions:{
            context:3000,
            tapItunes:6001,
            tapBoo:6002,
            tapCheer:6003,
            tapAgree:6004,
            tapDisagree:6005,
            loadedApp:6000,
            loadedCard:6006,
            navigateTap:6007,
            navigateSwipe:6008,
            /* http://insightsstaging.zelfy.com/inisghts/rlog */
            endpoint:'http://insightsprod.zelfy.com/insights/rlog',
            userIdentifier: '',
            sessionIdentifier: '',
            accessToken: ''
        },
        popupOptions:{},
        swipeOptions:{
            callback: function(index, elem)  {
                if (Controller.options.containers.remove)
                {
                    index--;
                }
                else if (! Controller.__navigating)
                {
                    Controller.__insights(Controller.options.insightsOptions.navigateSwipe, Model.rounds[Controller.__displayedRound].getModelData('id'), Model.rounds[index].getModelData('id'));
                }
                Controller.__navigationSwitch(index);
            },
            transitionEnd: function(index, elem)  {
                if (Controller.options.containers.remove)
                {
                    $('#' + Controller.options.containers.remove).remove();
                    Controller.options.containers.remove = null;
                    index--;
                    Controller.__swipeView.setup();
                    Controller.__swipeView.slide(index);
                }
                Controller.__insights(Controller.options.insightsOptions.loadedCard, encodeURI(Model.rounds[index].competitor.getModelData('name'))
                );
            },
            speed: 300,
            continuous:true
        },
        scoreOptions:{
            key: 'score',
            max: 1
        },
        modelOptions:{}
    },
    __lastMessage:null,
    __highestRound:-1,
    __navigating:false,
    __loading:true,
    __animating:0,
    __displayedRound:0,
    __animations: [],
    __initialized:false,
	__swipeView: null,
    __swipeInterval: 0
};

/*

 rm /Library/WebServer/da-dev.peel.com/americanidol-web/media/js/*.min.js
 java -jar /Users/doug/Downloads/yuicompressor-2.4.7/build/yuicompressor-2.4.7.jar -o '.js$:.min.js' /Library/WebServer/da-dev.peel.com/americanidol-web/media/js/*.js
 rm /Library/WebServer/da-dev.peel.com/americanidol-web/media/css/*.min.css
 java -jar /Users/doug/Downloads/yuicompressor-2.4.7/build/yuicompressor-2.4.7.jar -o '.css$:.min.css' /Library/WebServer/da-dev.peel.com/americanidol-web/media/css/*.css

 */

